window.SmartbrokerEnhancer = new (function () {
	var self = this;
	self.intervals = {};
	self.config = {};
	self.oldLength = -1;
	self.loginId = 0;

	self.keepActive = function(){
		$('body').click();
		console.log('Smartbroker Enhancer: Keep active..');
	}

	self.checkForChangesInterval = function(){
		if(window.location.pathname.indexOf('/smartbroker/Depot/Auftragsuebersicht/') > -1){
			if($('#dab\\:panelDiv ul li:nth-of-type(3)').hasClass('active')){
				console.log('Smartbroker Enhancer: Ready to check for new activities..');
				
				var refreshButton = document.getElementById('dab:refreshBtn');
				var evt = new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
					view: window
				});
				// If cancelled, don't dispatch our event
				var canceled = !refreshButton.dispatchEvent(evt);

				setTimeout(self.checkForChanges, 4000);
			}
		}
	}

	self.checkForChanges = function(){
		var currentLength = $('#dab\\:entryTable tbody').length;
		if(currentLength > 190){
			console.log('Smartbroker Enhancer: ERROR: alerting might be broken! More than 200 entries...')
		}else if(currentLength === -1){
			self.oldLength = currentLength;
		}

		if(self.oldLength < currentLength){
			// new things happend
			self.oldLength = currentLength;

			// report
			chrome.runtime.sendMessage({messageType: "activity"}, function(response) {
				console.log(response.answer);
			  });
			
		}
	}
	self.checkForLogoutPage = function(){
		if(window.location.href.indexOf('Logout.xhtml') > -1 || window.location.href.indexOf('b2b.dab-bank.de/Tradingcenter') > -1){
			window.location.href = 'https://b2b.dab-bank.de/smartbroker/';
		}
	}
	self.checkForLoginPage = function(){
		if(window.location.href == 'https://b2b.dab-bank.de/smartbroker/' && self.loginId.length > 5){
			$('#zugangsnummer').val(self.loginId);
			$('#identifier').focus();
		}
	}

	self.writeStyles = function(){
		var css = '#fullscreenDiv a.link_onetr_kauf {\
			max-width: 200px;\
			padding: 10px 17px 10px 40px;\
			text-indent: 0;\
			background-size: 39px;\
			background-position: 7px -851px;\
		}';
		css = '#fullscreenDiv a.link_onetr_kauf {\
			max-width: initial !important;\
			padding: initial !important;\
			text-indent: initial !important;\
			background-size: initial !important;\
			display: block;\
    padding: 0 0 4px 20px !important;\
    line-height: 14px !important;\
    font-size: 12px !important;\
    height: initial !important;\
    background-size: initial !important;\
    font-weight: initial !important;\
    max-width: initial !important;\
    overflow: initial !important;\
    text-indent: initial !important;\
    -webkit-transition:  initial !important;\
    transition:  initial !important;\
    text-decoration:  initial !important;\
    border-radius:  initial !important;\
    background-color:  initial !important;\
    color:  #666 !important;\
		}\
		#smartbroker a.link_onetr_kauf:focus, #smartbroker a.link_onetr_kauf:hover, #smartbroker a.link_onetr_kaufactive { \
			max-width: initial !important;\
			padding: 0 0 4px 20px !important;\
			text-decoration: underline !important;\
			text-indent: 0;\
		';
		// Create the Style Element
		var styleElem = document.createElement('style');
		styleElem.type = 'text/css' ;

		if(styleElem.styleSheet){
			styleElem.styleSheet.cssText = css;
		}
		else{
			styleElem.appendChild(document.createTextNode(css));
		}

		// Append the Style element to the Head
		var head = document.getElementsByTagName('head')[0] ;
		head.appendChild(styleElem)
	}

	self.replaceMenuPoints = function(){
		let menuDepot = '<li class="isAktiv"><a href="/Tradingcenter/Depot/Depotuebersicht/index.xhtml">Depot</a><ul> \
		<li><a href="/Tradingcenter/Depot/Depotuebersicht/index.xhtml">Depotübersicht</a></li> \
		<li><a href="/Tradingcenter/Depot/Auftragsuebersicht/index.xhtml">Auftragsübersicht</a></li> \
		</ul></li>';
		let menuTrading = '<li class="isAktiv"><a href="/Tradingcenter/Trading/Kaufen-Verkaufen/index.xhtml">Trading</a><ul> \
		<li><a href="/Tradingcenter/Trading/Kaufen-Verkaufen/index.xhtml">Kaufen / Verkaufen</a></li> \
		<li><a href="/Tradingcenter/Trading/Zeichnung/index.xhtml">Zeichnung</a></li> \
		<li><a href="/Tradingcenter/Trading/PRIIPs/index.xhtml">PRIIPs</a></li> \
		</ul></li>';
		
		const anchors = document.querySelectorAll('div.navi a.active');
		if(anchors.length > 0){
			let currentActiveLink = anchors[0].href;
			
			document.querySelectorAll('div.navi > ul > li')[1].innerHTML = menuDepot;
			document.querySelectorAll('div.navi > ul > li')[2].innerHTML = menuTrading;
	
			let activeElem;
			for(let aNode of document.querySelectorAll('div.navi a')){
				if(aNode.href === currentActiveLink){
					aNode.className = 'active';
					let c = 0, parent;
					while(c < 10){
						c++;
						parent = aNode.parentElement;
						if(parent.nodeName === "LI" || parent.nodeName === "UL"){
							parent.className = 'isAktiv';
						}else{
							break;
						}
					}
				}
			}
		}

	}

	self.updateConfig = function(config){

		if(config.checkForChanges){
			console.log('re-enable change check')
			if(self.intervals['checkForChanges']){
				clearInterval(self.intervals['checkForChanges']);
			}
			self.intervals['checkForChanges'] = setInterval(self.checkForChangesInterval, 30000);
		}else{
			console.log('disable change check')
			clearInterval(self.intervals['checkForChanges']);
		}

		if(config.loginId){
			self.loginId = config.loginId;
		}
	}

	self.readOutStocks = function(){
		let resultStocks = [];
		let listOfStocks = document.querySelector('#depotOverviewTable').querySelectorAll('tr.odd,tr.even');
		// run over stocks
		for(stockItem of listOfStocks){
			let listOfCells = stockItem.querySelectorAll('td');
			// run over single stock's data
			let stockObj = {};
			for(let i = 0; i < listOfCells.length; i++){
				let cell = listOfCells[i];
				switch (i) {
					case 0:
					// get name
					stockObj['name'] = cell.querySelector('a').text.replace(/\s+/g, " ").trim();
					// get WKN
					stockObj['wkn'] = cell.querySelectorAll('div.bez')[0].textContent.trim();
					// get number	
					stockObj['amount'] = cell.querySelectorAll('div.bez')[1].textContent.trim();
					stockObj['amount'] = stockObj['amount'].replace('.','').replace('Stück','').trim();
						break;
					case 1:
					// get currency
					stockObj['currency'] = cell.querySelectorAll('span.inakt')[0].textContent.trim();
					// get buyDate
					stockObj['buyDate'] = cell.querySelectorAll('span.inakt')[1].textContent.trim();
					// get type
					stockObj['type'] = cell.querySelectorAll('span.inakt')[2].textContent.trim();
					// get buyRate
					stockObj['buyRate'] = parseFloat(cell.querySelectorAll('span.betrag')[0].textContent.trim().replace('.','').replace(',','.'));
					// get totalPrice
					stockObj['totalPrice'] = parseFloat(cell.querySelectorAll('span.betrag')[1].textContent.trim().replace('.','').replace(',','.'));
						break;
				
					default:
						break;
				}
			}
			resultStocks.push(stockObj);
		}
		return resultStocks;
	}

	self.init = function(){
			self.intervals['readyStateCheckInterval'] = setInterval(function() {
				if (document.readyState === "complete") {
					clearInterval(self.intervals['readyStateCheckInterval']);
	
					console.log("Hello, inject.js initilized...");
	
					self.intervals['keepActive'] = setInterval(self.keepActive, 60000);
					self.intervals['checkForLogoutPage'] = setInterval(self.checkForLogoutPage, 1000);
					self.intervals['checkForLoginPage'] = setInterval(self.checkForLoginPage, 1000);
					self.intervals['checkForChanges'] = setInterval(self.checkForChangesInterval, 30000);
					self.writeStyles();
					self.replaceMenuPoints();
					console.log('Smartbroker Extension initilized..');


					// register receiver from background.js
					chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
							switch(message.type) {
								case "config-change":
									self.updateConfig(message.data);
									sendResponse(true);
								break;
								case "readOutStocks":
									sendResponse(self.readOutStocks());
								break;
								default: 
									console.log('received in frontend');
								break;
							}
							return true;
					});

					// request settings
					chrome.extension.sendMessage({type:"get-config"}, function(response) {
						console.log('got settings from background');
						self.updateConfig(response.data);
						return true;
					});
				}
			}, 10);
	}

	

	return self;
})().init();