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
		Game.Notify(`Autobuy is now enabled!`, '', [16,5, modDir + '/icon.png']);
		mod.buildingBulk = 10;

		//Hook up checking and buying the cheaptest thing to logic and trying to inject menu to every draw
		Game.registerHook('logic', () => {this.buyCheapest()}); 
		Game.registerHook('draw', () => {this.injectMenu()}); 
	},
	save:function(){
		return String(App.mods["autobuy"].buildingBulk);
	},
	load:function(loadStr){
		App.mods["autobuy"].buildingBulk = parseInt(loadStr || 10);

	},
	buyCheapest:function() {
		var mod = App.mods["autobuy"];
		var bulkAmount = mod.buildingBulk;

		var upgrades = Object.entries(Game.UpgradesInStore).filter(([index, upgrade]) => {
			return upgrade.basePrice <= Game.cookies && l('upgrades').querySelector(`#upgrade${index}`) != null;
		});

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
		}
		else if(cheapestUpgrade != null) {
			cheapestUpgrade[1].buy();
			var icons = "https://orteil.dashnet.org/cookieclicker/img/icons.png?v=2.031";
			var offsetX = parseInt(document.getElementById(`upgrade${cheapestUpgrade[0]}`).style.backgroundPositionX.replace('px', ''));
			var offsetY = parseInt(document.getElementById(`upgrade${cheapestUpgrade[0]}`).style.backgroundPositionY.replace('px', ''));
			Game.Notify(`Automatically bought ${cheapestUpgrade.name} upgrade`, '', [Math.abs(offsetX)/48,Math.abs(offsetY)/48, icons]);
		}
	},
	injectMenu: () => {
		//Detect closed menu or non options menu
		if(!l('menu').hasChildNodes() || l('menu').querySelector('#autoBuyerOptions') != null || !l('prefsButton').classList.contains('selected')) return;
		//This is basically just ripped from the source code

		//Encasing menu
		var optionFrame = document.createElement("div");
		optionFrame.id = "autoBuyerOptions";
		optionFrame.className = "framed";
		optionFrame.style.margin = "4px 48px";

		//content div
		var blockContent = document.createElement("div");
		blockContent.className = "block";
		blockContent.style.padding = "0px";
		blockContent.style.margin = "8px 4px";
		optionFrame.appendChild(blockContent);

		//subsection
		var subsection = document.createElement("div");
		subsection.className = "subsection";
		subsection.style.padding = "0px";
		blockContent.appendChild(subsection);

		//Title
		var title = document.createElement("div");
		title.className = "title";
		title.innerHTML = "Autobuy Settings";
		subsection.appendChild(title);

		//Listing
		var listing = document.createElement("div");
		listing.className = "listing";
		var inputListing = document.createElement("input");
		inputListing.className = "option";
		inputListing.onclick = "PlaySound('snd/tick.mp3');" //TODO;
		inputListing.type ="number";
		inputListing.value = App.mods["autobuy"].buildingBulk;
		inputListing.min = 0;
		inputListing.max = 1000;
		inputListing.id = "autoBuyerBulkValue";

		var buttonSubmitListing = document.createElement("a");
		buttonSubmitListing.className = "option smallFancyButton";
		buttonSubmitListing.innerHTML = "Set bulk amount";
		buttonSubmitListing.onclick = function() {
			PlaySound('snd/tick.mp3');
			var input = document.getElementById('autoBuyerBulkValue');
			App.mods["autobuy"].buildingBulk = parseInt(input.value);
		}
		
		var labelListing = document.createElement("label");
		labelListing.innerHTML = "Here you can change the amount of buildings the Autobuyer should buy at once";
		listing.appendChild(inputListing);
		listing.appendChild(buttonSubmitListing);
		listing.appendChild(labelListing);
		subsection.appendChild(listing);

		l('menu').insertBefore(optionFrame, l('menu').lastChild);
	}
});