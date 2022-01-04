Game.registerMod("autobuy", {
	init:function() {
		var mod = App.mods["autobuy"];
		var modDir;
		if(mod.dir.lastIndexOf('\\') == -1) {
			modDir =  '../mods/' + (mod.local ? 'local' : 'workshop') + '/' + mod.path;
		}
		else {
			modDir =  '../mods/' + mod.dir.substring(mod.dir.lastIndexOf('\\') + 1);
		}
		mod.modDirectory = modDir;
		Game.Notify(`Autobuy is now enabled!`, '', [16,5, modDir + '/icon.png']);
		mod.saveData = {"buildingBulk": 0, "buyUpgrades": false, "buyTimeline": []};

		//Hook up checking and buying the cheaptest thing to logic and trying to inject menu to every draw
		Game.registerHook('logic', () => {this.buyCheapest()}); 
		Game.registerHook('draw', () => {this.injectMenu()}); 
		Game.registerHook('draw', () => {this.hightlightNextPurchase()});
		Game.registerHook('reincarnate', () => {mod.saveData.buyTimeline = []});
		mod.context = this;
	},
	save:function(){
		return JSON.stringify(App.mods["autobuy"].saveData);
	},
	load:function(loadStr){
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
			savedata.buildingBulk = json.buildingBulk;
			savedata.buyUpgrades = json.buyUpgrades;
			savedata.buyTimeline = json.buyTimeline;
			/*: dummy timeline item
			savedata.buyTimeline.push({
				name: "Dummy",
				amount: "1",
				price: "10",
				backgroundX: 0,
				backgroundY: 0,
				time: Game.time
			});*/
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
	},
	buyCheapest:function() {
		var mod = App.mods["autobuy"];
		var bulkAmount = mod.saveData.buildingBulk;

		var upgrades = mod.saveData.buyUpgrades ? Object.entries(Game.UpgradesInStore).filter(([index, upgrade]) => {
			return upgrade.basePrice <= Game.cookies && l('upgrades').querySelector(`#upgrade${index}`) != null;
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
			if(products[i].getSumPrice(bulkAmount) < cheapestProduct[1]) {
				cheapestProduct = [products[i], products[i].getSumPrice(bulkAmount)];
			}
		}

		//Click cheapest option
		if((cheapestUpgrade == null || cheapestProduct[1] <= cheapestUpgrade[1].basePrice)) {
			cheapestProduct[0].buy(bulkAmount);
			var buildings = "https://orteil.dashnet.org/cookieclicker/img/buildings.png?v=5";
			var offsetX = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionX.replace('px', ''));
			var offsetY = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionY.replace('px', ''));
			Game.Notify(`Automatically bought ${cheapestProduct[0].name} ${bulkAmount} times`, '', [Math.abs(offsetX)/48,Math.abs(offsetY)/48, buildings]);
			mod.saveData.buyTimeline.push({
				name: cheapestProduct[0].name,
				amount: bulkAmount,
				price: cheapestProduct[1],
				backgroundX: offsetX,
				backgroundY: offsetY,
				time: Game.time
			});
		}
		else if(cheapestUpgrade != null) {
			cheapestUpgrade[1].buy();
			var icons = "https://orteil.dashnet.org/cookieclicker/img/icons.png?v=2.031";
			var offsetX = parseInt(document.getElementById(`upgrade${cheapestUpgrade[0]}`).style.backgroundPositionX.replace('px', ''));
			var offsetY = parseInt(document.getElementById(`upgrade${cheapestUpgrade[0]}`).style.backgroundPositionY.replace('px', ''));
			Game.Notify(`Automatically bought ${cheapestUpgrade[1].name} upgrade`, '', [Math.abs(offsetX)/48,Math.abs(offsetY)/48, icons]);
			mod.saveData.buyTimeline.push({
				name: cheapestUpgrade[1].name,
				amount: null,
				price: cheapestProduct[1].basePrice,
				backgroundX: offsetX,
				backgroundY: offsetY,
				time: Game.time
			});
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
			return;
		}

		var cheapestUpgrade = upgrades[0] || null;

		var cheapestProduct = [null, Infinity];
		for(var i = 0; i < products.length; i++) {
			if(products[i].getSumPrice(bulkAmount) < cheapestProduct[1]) {
				cheapestProduct = [products[i], products[i].getSumPrice(bulkAmount)];
			}
		}

		if((cheapestUpgrade == null || cheapestProduct[1] <= cheapestUpgrade[1].basePrice)) {
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
							"onmouseup=\"PlaySound('snd/tick.mp3');\" />"+
						 "</div>" + 
						 "<label>Here you can change the amount of buildings the Autobuyer should buy at once</label>";
		mod.context.appendRawOption(bulkSlider);

		//Enable/Disable Upgrade Autobuy 
		mod.context.appendOptionButton("Buy upgrades automatically", "App.mods['autobuy'].saveData.buyUpgrades=!App.mods['autobuy'].saveData.buyUpgrades;this.classList.toggle('off');", "buyUpgrades", null, "If turned on, upgrades will be considered when checking for cheapest option");

		//Buy timeline display
		if(mod.saveData.buyTimeline.length == 0) return;
		//The array should be sorted due to it's nature of how it's being pushed to, but just to be safe
		mod.saveData.buyTimeline.sort((a, b) => {
			//The bigger the time, the fresher the purchase
			return b.time - a.time;
		});
		//mod.context.appendRawOption("<div style='font-size: 17px; font-family: Kavoon, Georgia, serif;'>Buying Timeline (resets with ascension)</div>");
		var container = "<div style='overflow-y:auto; overflow-x:visible; max-height: 300px;'><br><div style='font-size: 17px; font-family: Kavoon, Georgia, serif;'>Buying Timeline (resets with ascension)</div> <br>";
		var tooltipStyle = 'visibility:hidden; width:160px; background-color:#555; color:#fff; text-align:center; border-radius:6px; padding:5px 0;' + 
							'position:absolute; z-index:999999999999999; bottom:110%; left:110%; margin-left:-60px; opacity:0; transition: opacity 0.3s;';
			for(var i = 0; i < mod.saveData.buyTimeline.length; i++) {
				container += `<div class="crate" style="background-position: ${mod.saveData.buyTimeline[i].backgroundX}px ${mod.saveData.buyTimeline[i].backgroundY}px; background-image: url(${mod.saveData.buyTimeline[i].amount == null ? 'img/icons.png?v=2.043' : 'img/buildings.png?v=5'})" onmouseover="this.children[0].style.visibility='visible'; this.children[0].style.opacity=1" onmouseout="this.children[0].style.visibility='hidden'; this.children[0].style.opacity=0"><span style="${tooltipStyle}">${mod.saveData.buyTimeline[i].name} <br> Bought ${(mod.saveData.buyTimeline[i].amount == null || mod.saveData.buyTimeline[i].amount == 1) ? '1 time' : (mod.saveData.buyTimeline[i].amount + " times")}</span></div>`
			}
		container += "</div>";
		mod.context.appendRawOption(container);

	},
	createBasicOptionMenu: () => {
		var optionFrame = document.createElement("div");
		optionFrame.id = "autoBuyerOptions";
		optionFrame.className = "framed";
		optionFrame.style.margin = "4px 48px";
		optionFrame.innerHTML = "<div class='block' style='padding: 0px; margin: 8px 4px'>"+
									"<div class='subsection' style='padding:0px'>" +
										"<div class='title'>Autobuy Settings</div>" + 
									"</div>" +
								"</div>";
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
		var buttonToInject = "<a class='option smallFancyButton" + ((App.mods["autobuy"].saveData[boundSetting]) ? '' : ' off') +
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
	}
});