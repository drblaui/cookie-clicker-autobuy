//TODO: Options Menu; Maybe change buyCheapest to logic event for logic Tick?
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
		this.buildingBulk = 10;
		setInterval(this.buyCheapest, 100, this.buildingBulk);
	},
	save:function(){
		return String(this.buildingBulk);
	},
	load:function(str){
		this.buildingBulk = parseInt(str || 10);
	},
	buyCheapest:function(bulkAmount) {
		var upgrades = Array.from(Game.UpgradesInStore).filter((upgrade) => {
			return upgrade.basePrice <= Game.cookies;
		});
		var products = Array.from(Game.ObjectsById).filter((gameObject) => {
			return !gameObject.locked && gameObject.getSumPrice(bulkAmount) <= Game.cookies;
		});

		if(upgrades.length == 0 && products.length == 0) {
			return;
		}

		//First upgrade will always be cheapest
		var cheapestUpgrade = upgrades[0] || null;

		//Product, Price
		var cheapestProduct = [null, Infinity];
		for(var i = 0; i < products.length; i++) {
			if(products[i].getSumPrice(bulkAmount) < cheapestProduct[1]) {
				cheapestProduct = [products[i], products[i].getSumPrice(bulkAmount)];
			}
		}

		var mod = App.mods["autobuy"];
		var modDir;
		if(mod.dir.lastIndexOf('\\') == -1) {
			modDir =  '../mods/' + (mod.local ? 'local' : 'workshop') + '/' + mod.path;
		}
		else {
			modDir =  '../mods/' + mod.dir.substring(mod.dir.lastIndexOf('\\') + 1);
		}

		//Click cheapest option
		if((cheapestUpgrade == null || cheapestProduct[1] <= cheapestUpgrade.basePrice)) {
			cheapestProduct[0].buy(bulkAmount);
			var buildings = modDir + "/orteilBuildings.png";
			var offsetX = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionX.replace('px', ''));
			var offsetY = parseInt(cheapestProduct[0].l.querySelectorAll('.icon:not(.off)')[0].style.backgroundPositionY.replace('px', ''));
			console.log([cheapestProduct[0].name, offsetX, offsetY]);
			Game.Notify(`Automatically bought ${cheapestProduct[0].name} ${bulkAmount} times`, '', [Math.abs(offsetX)/48,Math.abs(offsetY)/48, buildings]);
		}
		else if(cheapestUpgrade != null) {
			cheapestUpgrade.buy();
			var icons =  modDir + "/orteilIcons.png";
			var offsetX = parseInt(document.getElementById('upgrade0').style.backgroundPositionX.replace('px', ''));
			var offsetY = parseInt(document.getElementById('upgrade0').style.backgroundPositionY.replace('px', ''));
			Game.Notify(`Automatically bought ${cheapestUpgrade.name} upgrade`, '', [Math.abs(offsetX)/48,Math.abs(offsetY)/48, icons]);
		}
	}
});