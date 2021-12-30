//TODO: Options Menu
Game.registerMod("autobuy", {
	init:function() {
		//TODO: [0,0, URL]
		Game.Notify(`Autobuy is now enabled!`, '', [16,5 ]);
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

		//Click cheapest option
		if((cheapestUpgrade == null || cheapestProduct[1] <= cheapestUpgrade.basePrice)) {
			cheapestProduct[0].buy(bulkAmount);
			Game.Notify(`Buying cheapest product ${bulkAmount} times: ${cheapestProduct[0].name}`, '', [16,5]);
		}
		else if(cheapestUpgrade != null) {
			cheapestUpgrade.buy();
			Game.Notify(`Buying cheapest upgrade: ${cheapestUpgrade.name}`, '', [16,5]);
		}
	}
});