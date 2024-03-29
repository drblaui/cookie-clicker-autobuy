function requestTemplate(template, dir) {
	let xhr = new XMLHttpRequest();
	xhr.open("GET", `${dir}/templates/${template}.html`, false);
	xhr.send();
	let parser = new DOMParser();
	let doc = parser.parseFromString(xhr.responseText, "text/html");
	return doc.body.children[0];
}

Game.registerMod("autobuy", {
	init: function (){
		var mod = App.mods["autobuy"];
		var modDir;
		if(mod.dir.lastIndexOf('\\') == -1) {
			modDir =  '../mods/' + (mod.local ? 'local' : 'workshop') + '/' + mod.path;
		}
		else {
			modDir =  '../mods/' + mod.dir.substring(mod.dir.lastIndexOf('\\') + 1);
		}
		mod.context = this;
		mod.context.scrollPos = 0; 
		mod.context.modDirectory = modDir;
		Game.Notify(`Autobuy is now enabled!`, '', [16,5, modDir + '/thumbnail.png']);
		mod.saveData = {"buildingBulk": 0, "buyUpgrades": false, "buyTimeline": [], "keepTimeline": false, "announcements": true, "excludedBuildings": []};

		this.injectNextBuyContainer();
		//Hook up checking and buying the cheaptest thing to logic and trying to inject menu to every draw
		Game.registerHook('logic', () => {this.buyCheapest()}); 
		Game.registerHook('logic', () => {
			if(l('scroll-container')) {
				mod.context.scrollPos = l('scroll-container').scrollTop;
			}
		});
		Game.registerHook('draw', () => {this.injectMenu()}); 
		Game.registerHook('draw', () => {this.hightlightNextPurchase()});
		Game.registerHook('reincarnate', () => {
			mod.saveData.buyTimeline = [];
			mod.timelineString = "<div id='scroll-container' style='overflow-y:auto; overflow-x:visible; max-height: 300px;'><br><div style='font-size: 17px; font-family: Kavoon, Georgia, serif;'>Buying Timeline (resets with ascension)</div> <br> </div>";
		});
	},
	save: () => {
		return JSON.stringify(App.mods["autobuy"].saveData);
	},
	load: (loadStr) => {
		try {
			var savedata = App.mods["autobuy"].saveData;
			var json = JSON.parse(loadStr);	
			if(json.buildingBulk == undefined || typeof json.buildingBulk != "number") {
				json.buildingBulk = 0;
			}
			if(json.buyUpgrades == undefined || typeof json.buyUpgrades != "boolean") {
				json.buyUpgrades = false;
			}
			if(json.buyTimeline == undefined || typeof json.buyTimeline != "object") {
				json.buyTimeline = [];
			}
			if(json.keepTimeline == undefined || typeof json.keepTimeline != "boolean") {
				json.keepTimeline = false;
			}
			if(json.announcements == undefined || typeof json.announcements != "boolean") {
				json.announcements = true;
			}
			if(json.excludedBuildings == undefined || typeof json.excludedBuildings != "object") {
				json.excludedBuildings = [];
			}
			savedata.buildingBulk = json.buildingBulk;
			savedata.buyUpgrades = json.buyUpgrades;
			savedata.buyTimeline = json.buyTimeline;
			savedata.keepTimeline = json.keepTimeline;
			savedata.announcements = json.announcements;
			savedata.excludedBuildings = json.excludedBuildings;
			/*: dummy timeline item 
			savedata.buyTimeline.push({
				name: "Dummy",
				amount: "1",
				price: "10",
				backgroundX: 0,
				backgroundY: 0,
				time: Game.time
			});*/
			App.mods["autobuy"].context.generateTimelineString();
		}
		catch (e) {
			App.mods["autobuy"].context.setDefaultOptions();
		}
	},
	setDefaultOptions: () => {
		App.mods["autobuy"].saveData = {};
		App.mods["autobuy"].saveData.buildingBulk = 0;
		App.mods["autobuy"].saveData.buyUpgrades = false;
		App.mods["autobuy"].saveData.buyTimeline = [];
		App.mods["autobuy"].saveData.keepTimeline = false;
		App.mods["autobuy"].saveData.announcements = true;
		App.mods["autobuy"].saveData.excludedBuildings = [];
	},
	buyCheapest: () => {
		var mod = App.mods["autobuy"];
		var bulkAmount = mod.saveData.buildingBulk;

		var upgrades = mod.saveData.buyUpgrades ? Object.entries(Game.UpgradesInStore).filter(([index, upgrade]) => {
			return upgrade.getPrice() <= Game.cookies && l('upgrades').querySelector(`#upgrade${index}`) != null;
		}) : [];

		var products = bulkAmount != 0 ? Array.from(Game.ObjectsById).filter((gameObject) => {
			return !gameObject.locked && gameObject.getSumPrice(bulkAmount) <= Game.cookies;
		}) : [];

		if(upgrades.length == 0 && products.length == 0) {
			return;
		}

		//First upgrade will always be cheapest
		var cheapestUpgrade = upgrades[0] || null;

		//[Product, Price]
		var cheapestProduct = [null, Infinity];
		for(var i = 0; i < products.length; i++) {
			if(mod.saveData.excludedBuildings.includes(products[i].id)) continue; //Skips over excluded products
			if(products[i].getSumPrice(bulkAmount) < cheapestProduct[1]) {
				cheapestProduct = [products[i], products[i].getSumPrice(bulkAmount)];
			}
		}

		//Click cheapest option
		if((cheapestUpgrade == null || cheapestProduct[1] <= cheapestUpgrade[1].getPrice())) {
			cheapestProduct[0].buy(bulkAmount);
			var buildings = "https://orteil.dashnet.org/cookieclicker/img/buildings.png?v=5";
			var offsetX = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionX.replace('px', ''));
			var offsetY = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionY.replace('px', ''));
			if(mod.saveData.announcements) {
				Game.Notify(`Automatically bought ${cheapestProduct[0].name} ${bulkAmount} times`, '', [Math.abs(offsetX)/48,Math.abs(offsetY)/48, buildings]);
			}
			if(mod.saveData.keepTimeline) {
				var product = {
					name: cheapestProduct[0].name,
					amount: bulkAmount,
					price: cheapestProduct[1],
					backgroundX: offsetX,
					backgroundY: offsetY,
					time: Game.time
				}
				mod.saveData.buyTimeline.unshift(product);
				mod.context.appendToTimeline(product);
			}
		}
		else if(cheapestUpgrade != null) {
			cheapestUpgrade[1].buy();
			var icons = `https://orteil.dashnet.org/cookieclicker/img/icons.png?v=${Game.version}`;
			var offsetX = parseInt(l(`upgrade${cheapestUpgrade[0]}`).style.backgroundPositionX.replace('px', ''));
			var offsetY = parseInt(l(`upgrade${cheapestUpgrade[0]}`).style.backgroundPositionY.replace('px', ''));
			if(mod.saveData.announcements) {
				Game.Notify(`Automatically bought ${cheapestUpgrade[1].name} upgrade`, '', [Math.abs(offsetX)/48,Math.abs(offsetY)/48, icons]);
			}
			if(mod.saveData.keepTimeline) {
				var upgrade = {
					name: cheapestUpgrade[1].name,
					amount: null,
					price: cheapestProduct[1].basePrice,
					backgroundX: offsetX,
					backgroundY: offsetY,
					time: Game.time
				}
				mod.saveData.buyTimeline.unshift(upgrade);
				mod.context.appendToTimeline(upgrade);
			}
		}
	},
	//I know this is basically mostly a copy of buyCheapest(), I'll think about abstracting it
	hightlightNextPurchase: () => {
		var mod = App.mods["autobuy"];
		var bulkAmount = mod.saveData.buildingBulk;

		var upgrades = mod.saveData.buyUpgrades ? Object.entries(Game.UpgradesInStore).filter(([index, upgrade]) => {
			return l('upgrades').querySelector(`#upgrade${index}`) != null;
		}) : [];

		var products = bulkAmount != 0 ? Array.from(Game.ObjectsById).filter((gameObject) => {
			return !gameObject.locked;
		}) : [];

		if(upgrades.length == 0 && products.length == 0) {
			if(l('autobuyStoreSection')) l('autobuyStoreSection').remove();
			return;
		}
		if(l('autobuyStoreSection') == null) mod.context.injectNextBuyContainer();
		var cheapestUpgrade = upgrades[0] || null;

		var cheapestProduct = [null, Infinity];
		for(var i = 0; i < products.length; i++) {
			if(mod.saveData.excludedBuildings.includes(products[i].id)) continue;
			if(products[i].getSumPrice(bulkAmount) < cheapestProduct[1]) {
				cheapestProduct = [products[i], products[i].getSumPrice(bulkAmount)];
			}
		}

		if((cheapestUpgrade == null || cheapestProduct[1] <= cheapestUpgrade[1].getPrice())) {
			if(cheapestProduct[0].l.querySelector('#nextPurchaseIndicator') == null) {
				if(l('nextPurchaseIndicator') != null) {
					l('nextPurchaseIndicator').remove();
				}
				var nextContainer = document.createElement("div"); 
				nextContainer.id = "nextPurchaseIndicator";
				nextContainer.style.position = "absolute";
				nextContainer.style.top = "5px";
				nextContainer.style.opacity = "1 !important";
				nextContainer.style.zIndex = "11";
				nextContainer.innerHTML = "<p style='color:green; font-weight:bold;'> Next </p>";
				cheapestProduct[0].l.appendChild(nextContainer);
				l('autoBuyNext').style.backgroundImage = "url(img/buildings.png?v=5)";
				var offsetX = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionX.replace('px', ''));
				var offsetY = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionY.replace('px', ''));
				l('autoBuyNext').style.backgroundPosition = `${offsetX}px ${offsetY}px`;
				l('autoBuyNextName').innerHTML = cheapestProduct[0].name;
				if(cheapestProduct[0].name.length > 28) {
					l('autoBuyNextName').style.fontSize = "10px";
				}
				else l('autoBuyNextName').style.removeProperty('font-size');
			}
		}
		else if(cheapestUpgrade != null) {
			if(l('upgrade' + cheapestUpgrade[0]).querySelector('#nextPurchaseIndicator') == null) {
				if(l('nextPurchaseIndicator') != null) {
					l('nextPurchaseIndicator').remove();
				}
				var nextContainer = document.createElement("div"); 
				nextContainer.id = "nextPurchaseIndicator";
				nextContainer.style.position = "absolute";
				nextContainer.style.top = "5px";
				nextContainer.style.opacity = "1 !important";
				nextContainer.style.zIndex = "11";
				nextContainer.innerHTML = "<p style='color:green; font-weight:bold;'> Next </p>";
				l('upgrade' + cheapestUpgrade[0]).appendChild(nextContainer);
				l('autoBuyNext').style.backgroundImage = `url(img/icons.png?v=${Game.version})`;
				var offsetX = parseInt(l(`upgrade${cheapestUpgrade[0]}`).style.backgroundPositionX.replace('px', ''));
				var offsetY = parseInt(l(`upgrade${cheapestUpgrade[0]}`).style.backgroundPositionY.replace('px', ''));
				l('autoBuyNext').style.backgroundPosition = `${offsetX}px ${offsetY}px`;
				l('autoBuyNextName').innerHTML = cheapestUpgrade[1].name
				if(cheapestUpgrade[1].name.length > 28) {
					l('autoBuyNextName').style.fontSize = "10px";
				}
				else l('autoBuyNextName').style.removeProperty('font-size');
			}
		}
	},
	injectMenu: () => {
		//Detect closed menu or non options menu
		if(!l('menu').hasChildNodes() || l('menu').querySelector('#autoBuyerOptions') != null || !l('prefsButton').classList.contains('selected')) return;
		var mod = App.mods["autobuy"];
		mod.context.createBasicOptionMenu();
		//Bulk Amount Option
		var bulkSlider = "<div class='sliderBox'>"+
		  				 	"<div style='float:left;' class='smallFancyButton'>Bulk Buy Amount</div>" + 
							"<div style='float:right;' class='smallFancyButton' id='autoBuyBulkAmountText'>" + App.mods["autobuy"].saveData.buildingBulk +"</div>" + 
							"<input class='slider' style='clear:both;' type='range' min='0' max='100' value='" + 
							App.mods["autobuy"].saveData.buildingBulk + "' id='autoBuyBulkAmount' " +
							"onchange=\"App.mods['autobuy'].saveData.buildingBulk = parseInt(this.value); l('autoBuyBulkAmountText').innerHTML = this.value;\" " +
							"onmouseup=\"PlaySound('snd/tick.mp3');\"" + 
							"oninput=\"l('autoBuyBulkAmountText').innerHTML = this.value;\"/>"+
						 "</div>" + 
						 "<label>Here you can change the amount of buildings the Autobuyer should buy at once</label>";
		mod.context.appendRawOption(bulkSlider);

		//Enable/Disable Upgrade Autobuy 
		mod.context.appendOptionButton("Buy upgrades automatically", "App.mods['autobuy'].saveData.buyUpgrades=!App.mods['autobuy'].saveData.buyUpgrades;this.classList.toggle('off');", "buyUpgrades", null, "If turned on, upgrades will be considered when checking for cheapest option");
		//Notifications
		mod.context.appendOptionButton("Show Notifications", "App.mods['autobuy'].saveData.announcements=!App.mods['autobuy'].saveData.announcements; this.classList.toggle('off');", "announcements", null, "If turned on, notifications will be shown when the Autobuyer buys something");
		//Excluding
		mod.context.appendOptionButton("Pick excluded Buildings", "App.mods['autobuy'].context.openBuildingPicker()", null, null, "Select what Buildings the mod should ignore");
		//Buying Timeline
		mod.context.appendOptionButton("Create Buying Timeline", "App.mods['autobuy'].saveData.keepTimeline=!App.mods['autobuy'].saveData.keepTimeline; this.classList.toggle('off'); App.mods['autobuy'].saveData.keepTimeline ? (App.mods['autobuy'].context.generateTimelineString()) : null;", "keepTimeline", null, "This will show you a container of what you bought. (This may cause stutter when you bought a lot)");
		if(mod.saveData.buyTimeline.length == 0 || !App.mods["autobuy"].saveData.keepTimeline) return;
		mod.context.appendOptionButton("Clear Timeline", "App.mods['autobuy'].saveData.buyTimeline = []; App.mods['autobuy'].context.generateTimelineString();", null, null, "Clears current timeline");
		mod.context.appendRawOption(mod.timelineString);
		l('scroll-container').scrollTop = mod.context.scrollPos;
	},
	generateTimelineString: async () => {
		//Buy timeline display
		var mod = App.mods["autobuy"];
		if(!mod.saveData.keepTimeline) return;
		//The array should be sorted due to it's nature of how it's being pushed to, but just to be safe
		mod.saveData.buyTimeline.sort((a, b) => {
			//The bigger the time, the fresher the purchase
			return b.time - a.time;
		});
		var container = "<div id='scroll-container' style='overflow-y:auto; overflow-x:visible; max-height: 300px;'><br><div style='font-size: 17px; font-family: Kavoon, Georgia, serif;'>Buying Timeline (resets with ascension)</div> <br>";
		var tooltipStyle = 'visibility:hidden; width:160px; background-color:#555; color:#fff; text-align:center; border-radius:6px; padding:5px 0;' + 
							'position:absolute; z-index:999999999999999; bottom:110%; left:110%; margin-left:-60px; opacity:0; transition: opacity 0.3s;';
			for(var i = 0; i < mod.saveData.buyTimeline.length; i++) {
				container += `<div class="crate enabled" style="background-position: ${mod.saveData.buyTimeline[i].backgroundX}px ${mod.saveData.buyTimeline[i].backgroundY}px; background-image: url(${mod.saveData.buyTimeline[i].amount == null ? `img/icons.png?v=${Game.version}` : 'img/buildings.png?v=5'})" onmouseover="this.children[0].style.visibility='visible'; this.children[0].style.opacity=1" onmouseout="this.children[0].style.visibility='hidden'; this.children[0].style.opacity=0"><span style="${tooltipStyle}">${mod.saveData.buyTimeline[i].name} <br> Bought ${(mod.saveData.buyTimeline[i].amount == null || mod.saveData.buyTimeline[i].amount == 1) ? '1 time' : (mod.saveData.buyTimeline[i].amount + " times")}</span></div>`;
			}
		container += "</div>";
		mod.timelineString = container;
		//console.log(timelineSring);
	},
	appendToTimeline: async (timelineObject) => {
		var mod = App.mods["autobuy"];
		var tl = mod.timelineString.slice(0,-6);
		var tooltipStyle = 'visibility:hidden; width:160px; background-color:#555; color:#fff; text-align:center; border-radius:6px; padding:5px 0;' + 
							'position:absolute; z-index:999999999999999; bottom:110%; left:110%; margin-left:-60px; opacity:0; transition: opacity 0.3s;';
		tl += `<div class="crate enabled" style="background-position: ${timelineObject.backgroundX}px ${timelineObject.backgroundY}px; background-image: url(${timelineObject.amount == null ? `img/icons.png?v=${Game.version}` : 'img/buildings.png?v=5'})" onmouseover="this.children[0].style.visibility='visible'; this.children[0].style.opacity=1" onmouseout="this.children[0].style.visibility='hidden'; this.children[0].style.opacity=0"><span style="${tooltipStyle}">${timelineObject.name} <br> Bought ${(timelineObject.amount == null || timelineObject.amount == 1) ? '1 time' : (timelineObject.amount + " times")}</span></div>`;
		tl += "</div>";
		mod.timelineString = tl;
	},
	createBasicOptionMenu: () => {
		let optionFrame = requestTemplate("basicOptionMenu", App.mods["autobuy"].context.modDirectory);
		l('menu').insertBefore(optionFrame, l('menu').lastChild);
	},
	/*
	 * Appends an option into the option menu
	 * @param {string} buttonString - Text the button will hold
	 * @param {string} onclick - Function that happens when the button is clicked (this doesn't need PlaySound, as it will automatically be added)
	 * @param {string} boundSetting - Reference to the corresponding boolean in the saveData that the button will toggle
	 * @param {string} id - Optional, only use if you want to reference the button itself
	 * @param {string} label - Optional, only use if you feel the need to explain what the button does next to it
	 */
	appendOptionButton: (buttonString, onclick, boundSetting, id = null, label=null) => {
		var buttonToInject = "<a class='option smallFancyButton" + ((App.mods["autobuy"].saveData[boundSetting] || boundSetting == null) ? '' : ' off') +
							 	"' onclick=\"PlaySound('snd/tick.mp3');" + onclick + "\"" + 
							    ((id != null) ? ("id=" + id) : '') + ">" + buttonString + "</a>" + 
								((label != null) ? (`<label>${label}</label>`) : '');
		App.mods["autobuy"].context.appendRawOption(buttonToInject);
	},
	appendRawOption: (optionHTML) => {
		var optionDiv = document.createElement("div");
		optionDiv.className = "listing";
		optionDiv.innerHTML = optionHTML;
		l('autoBuyerOptions').querySelector('.subsection').appendChild(optionDiv);
	},
	injectNextBuyContainer: () => {
		let inject = requestTemplate('nextBuyContainer', App.mods["autobuy"].context.modDirectory);
		l('storeTitle').parentNode.insertBefore(inject, l('storeTitle').nextSibling);
	},
	openBuildingPicker: () => {
		/**
		 * cheapestProduct[0].l.appendChild(nextContainer);
				l('autoBuyNext').style.backgroundImage = "url(img/buildings.png?v=5)";
				var offsetX = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionX.replace('px', ''));
				var offsetY = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionY.replace('px', ''));
				l('autoBuyNext').style.backgroundPosition = `${offsetX}px ${offsetY}px`;
		 */
		let products = "";

		for(let product of Game.ObjectsById) {
			let offsetX = product.l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionX.replace('px', '')
			let offsetY = product.l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionY.replace('px', '')

			products += `<div id="building-exclude-${product.id}" 
			class="crate ${App.mods['autobuy'].saveData.excludedBuildings.includes(product.id) ? 'enabled' : ''}"; 
			style="background-image:url(img/buildings.png?v=5); background-position: ${offsetX}px ${offsetY}px"
			onclick="App.mods['autobuy'].context.toggleExcluded(${product.id}); document.getElementById('building-exclude-${product.id}').classList.toggle('enabled')">
			</div>`
		}

		Game.Prompt(`<id PickBuilding>
		<h3>Excluded Buildings</h3>
		<div class="line"></div>
		<div style="font-size:11px;opacity:0.7;">Highlighted Buildings will be excluded when autobuying</div>
		<div class="line"></div>
		${products}
		`, [loc("Close")]);
	},
	toggleExcluded: (itemId) => {
		if(App.mods["autobuy"].saveData.excludedBuildings.includes(itemId)) {
			App.mods["autobuy"].saveData.excludedBuildings = App.mods["autobuy"].saveData.excludedBuildings.filter((building) => building !== itemId);
		}
		else {
			App.mods["autobuy"].saveData.excludedBuildings.push(itemId);
		}
	}
});