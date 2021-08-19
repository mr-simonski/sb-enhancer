window['SmartbrokerEnhancer'] = new (function () {
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
				// console.log(response.answer);
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
		}\
		.se-isin-details-holder {\
			position: absolute;\
			z-index: 9;\
			background-color: #fff;\
			padding: 20px;\
			border: 1px solid #aaa;\
			box-shadow: 16px 7px 14px -11px rgb(0 0 0 / 74%);\
			top: 70px;\
		}\
		.se-isin-details-holder .btn_close{cursor: pointer}\
		#historic-table_wrapper{margin-top: 60px}\
		#tableDiv span.se-totalTransactions{ border-bottom: 2px dotted;cursor: pointer;line-height: 1.3em !important;}\
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

		self.config = config;
	}

	self.readOutStocks = function(){
		let resultStocks = [];
		if(window.location.pathname.indexOf('Depot/Depotuebersicht/') < 0){
			return resultStocks;
		}
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
					case 2:
					// get currency
					stockObj['currency'] = cell.querySelectorAll('span.inakt')[0].textContent.trim();
					// get transactionDate
					stockObj['transactionDate'] = cell.querySelectorAll('span.inakt')[1].textContent.trim();
					// get type
					stockObj['type'] = cell.querySelectorAll('span.inakt')[2].textContent.trim();
					// get rate
					stockObj['rate'] = parseFloat(cell.querySelectorAll('span.betrag')[0].textContent.trim().replace('.','').replace(',','.'));
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

	self.readOutPastStocks = async function(){
		clearInterval(self.intervals['checkForChanges']);

		let resultStocks = {};
		// check if on correct page
		// read out elements on page
		let run = true, count = 100; // max 100 pages for now
		while(run && count-- > 0){
			// open up all "+"
			let c = 110;
			while(c-- > 0){
				const plusIcons = document.querySelectorAll('a[class^="ic_plus_gruen"');
				if(plusIcons.length == 0) break;
				for(let plus of plusIcons){
					plus.click();
					await self.sleep(400);
				}
				if(plusIcons.length > 0){
					await self.sleep(8000);
				}
			}
			//while(document.querySelectorAll('a[class^="ic_plus_gruen"').length > 0 && c-- > 0){
			//	document.querySelectorAll('a[class^="ic_plus_gruen"')[0].click();
			//}
			
			// let listOfStocks = document.querySelector('#dab\\3A entryTable').querySelectorAll('tr.odd:not(.openparent),tr.even:not(.openparent)');
			let listOfStocks = document.querySelector('#dab\\3A entryTable').querySelectorAll('tbody tr');
			// give to parse function
			let newListOfTransactions = self.parseStocksFromTable(listOfStocks);
			for(let transaction of newListOfTransactions){
				if(resultStocks[transaction.transactionId] == null){
					resultStocks[transaction.transactionId] = transaction;
				}else{
					console.log("transactionId already exists - this should never happen: " + transaction.transactionId);
					console.log(transaction);
				}
			}
			
			
			// check for next page, repeat
			if(document.querySelector('.pag_forw:not(.dis)') !== null && document.querySelectorAll('.pag_forw:not(.dis)').length > 0){
				document.querySelector('.pag_forw:not(.dis)').click();
				await self.sleep(1000);
				if(document.querySelector('#dab\\3A transactionsPanel').hasAttribute('style')){
					let timeCount = 100;
					while(timeCount-- > 0 && document.querySelector('#dab\\3A transactionsPanel').hasAttribute('style')){
						await self.sleep(1000);
					}
				}
			}else{
				break;
			}
		}
		
		
		if(self.config.checkForChanges){
			console.log('re-enable change check')
			if(self.intervals['checkForChanges']){
				clearInterval(self.intervals['checkForChanges']);
			}
			self.intervals['checkForChanges'] = setInterval(self.checkForChangesInterval, 30000);
		}
		return resultStocks;
	}

	self.parseStocksFromTable = function(listOfStocks){
		let transactionIdRegEx = new RegExp("'\\d{8,}'\,","");
		let resultStocks = [];
		outer:for(stockItem of listOfStocks){
			let listOfCells = stockItem.querySelectorAll('td');
			// run over single stock's data
			let stockObj = {};
			inner:for(let i = 0; i < listOfCells.length; i++){
				let cell = listOfCells[i];
				switch (i) {
					case 0:
						if(cell.textContent.trim().toLowerCase().indexOf("kauf") < 0){
							break inner;
						}
						// get order id
						stockObj['orderId'] = cell.querySelector('span:last-of-type').textContent.trim();
					break;
					case 1:
						// get number	
						stockObj['amount'] = cell.textContent.trim();
						stockObj['amount'] = stockObj['amount'].replace('.','').replace('Stück','').trim();
					break;
					case 2:
						// get name
						stockObj['name'] = cell.querySelectorAll('span')[0].textContent.replace(/\s+/g, " ").trim();
						// get WKN
						stockObj['wkn'] = cell.querySelectorAll('span.bez')[0].textContent.trim();
						// get ISIN
						stockObj['isin'] = cell.querySelectorAll('span.bez')[1].textContent.trim();
					break;
					case 3:
						// get exchange
						stockObj['exchange'] = cell.querySelectorAll('span')[0].textContent.trim();
					break;
					case 5:
						if(cell.querySelectorAll('span.betrag')[0].textContent.toLowerCase().trim().indexOf('abgerechnet') < 0){
							stockObj = {};
							break inner;
						}
						// get rate
						stockObj['rate'] = parseFloat(cell.querySelectorAll('span.betrag')[1].textContent.trim().replace('.','').replace(',','.'));
						stockObj['type'] = stockObj['rate'] > 0 ? 'BUY' : "SELL";
						// get currency
						stockObj['currency'] = cell.querySelectorAll('span.betrag')[2].textContent.trim();
					break;
					case 6:
						// get totalPrice
						stockObj['totalPrice'] = parseFloat(cell.querySelectorAll('span.betrag')[0].textContent.trim().replace('.','').replace(',','.'));
						// get transactionDate
						stockObj['transactionDate'] = cell.querySelectorAll('span.betrag')[1].textContent.trim();
						// get transactionTime
						stockObj['transactionTime'] = cell.querySelectorAll('span.betrag')[2].textContent.trim();
					break;
					case 7:
						// get real transactionId
						let onClickValue = cell.querySelector('a[class="link_order_details"]').attributes['onclick'].value;
						onClickValue = onClickValue.match(transactionIdRegEx)[0];
						stockObj['transactionId'] = onClickValue.replaceAll("'","").replace(",","");
					break;
				
					default:
						break;
				}
			}
			if(Object.keys(stockObj).length != 0){
				resultStocks.push(stockObj);
			}
		}
		return resultStocks;
	}
	
	self.sleep = function(milliseconds) {
		return new Promise(resolve => setTimeout(resolve, milliseconds));
	}

	self.renderAdditionalInformation = function(data){
		if(window.location.pathname.indexOf("smartbroker/Depot/Depotuebersicht") > -1){
			// console.log(data);
			// add sums
			self.renderDepotAdditionalSums();

			// render historic data
			if(data != null && data.stockTransactions != null && Object.keys(data.stockTransactions).length > 0){
				let stockData = {};
				for(let transactionId of Object.keys(data.stockTransactions)){
					let singleTransaction = data.stockTransactions[transactionId];
					if(typeof stockData[singleTransaction.isin] === 'undefined'){
						stockData[singleTransaction.isin] = {};
						stockData[singleTransaction.isin].transactions = [];
					}
					stockData[singleTransaction.isin].transactions.push(singleTransaction);
				}
				// console.log(stockData);
	
				// order
				for(let isin in stockData){
					stockData[isin].transactions = stockData[isin].transactions.sort(function(a, b) {
						return parseInt(a.transactionId) - parseInt(b.transactionId);
					});
					// calc plus/minus
					let totalAmount = 0;
					let maxOwnedAmount = 0;
					let currentlyOwnedAmount = 0;
					// console.log(isin);
					for(let transaction of stockData[isin].transactions){
						stockData[isin].name = transaction.name;
						stockData[isin].wkn = transaction.wkn;
						// console.log(transaction.totalPrice);
						totalAmount += transaction.totalPrice;
						if(transaction.totalPrice > 0){
							currentlyOwnedAmount += parseInt(transaction.amount);
							if(maxOwnedAmount < currentlyOwnedAmount){
								maxOwnedAmount = currentlyOwnedAmount;
							}
						}else{
							currentlyOwnedAmount -= parseInt(transaction.amount);
						}
						transaction.ownedAmountAtThatTime = currentlyOwnedAmount;
					}
					stockData[isin].transactions = stockData[isin].transactions.sort((a,b) => new moment(b.transactionDate + " " + b.transactionTime, "DD.MM.YYYY HH:mm:ss").diff(new moment(a.transactionDate+ " " + a.transactionTime, "DD.MM.YYYY HH:mm:ss"))); 
					stockData[isin].totalAmount = -1 * totalAmount;
					stockData[isin].maxOwnedAmount = maxOwnedAmount;
					stockData[isin].currentlyOwnedAmount = currentlyOwnedAmount;
				}
	
				// tune nodes
				// header/footer
				let referenceNode = document.querySelector('#depotOverviewTable tbody tr:first-of-type th:nth-child(1)');
				let newNode = self.htmlToElement('<th class="mdt_kurs" scope="col"><h3>Historisch</h3><div class="col"><span><a href="#">Max.Besessen</a></span><span><a href="#">Total G/V</a></span><span><a href="#">Transaktionen</a></span></div></th>');
				referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
	
				referenceNode = document.querySelector('#depotOverviewTable tbody tr:last-of-type td:nth-child(1)');
				newNode = self.htmlToElement('<td></td>');
				referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
	
				let alreadyPrintedStocks = [];
				for(let trNode of document.querySelectorAll('#depotOverviewTable tbody tr.odd,#depotOverviewTable tbody tr.even')){
					let isin = trNode.querySelector('td:first-of-type div div.bez').innerText;
					if(typeof stockData[isin] !== 'undefined'){
						alreadyPrintedStocks.push(isin);
						let currentValue = trNode.querySelector('td:nth-child(4) span.betrag').innerText;
						currentValue = parseFloat(currentValue.replace('.','').replace(',','.'));
						referenceNode = trNode.querySelector('td:nth-child(1)');
						const totalPlusMinus = stockData[isin].totalAmount + currentValue;
						newNode = self.htmlToElement('<td><div class="col"><span class="inakt">'+self.numberFormatter(stockData[isin].maxOwnedAmount)+' Stück</span>\
						<span class="se-totalPlusMinus '+(totalPlusMinus > 0 ? 'pos':'neg')+'" >'+ self.priceFormatter(totalPlusMinus) +'  EUR</span>\
						<span class="se-totalTransactions inakt" onclick="this.dispatchEvent(new CustomEvent(\'showIsinDetails\', {bubbles:true, detail: \''+isin+'\'}))">'+ stockData[isin].transactions.length +' Transaktion' + (stockData[isin].transactions.length > 1 ? 'en':'') + '</span>\</div></td>');
						referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
					}
				}
				self.stockData = stockData;			
				// console.log(stockData);
				self.insertNonPrintedStocks(alreadyPrintedStocks);
			} // end check for data
		} // end check for depot page
	}

	self.renderDepotAdditionalSums = function(){
		let posSum = 0, negSum = 0;
		for(let tdNode of document.querySelectorAll('#depotOverviewTable tbody tr.odd td:nth-of-type(4) span:nth-of-type(2) span:nth-of-type(1),#depotOverviewTable tbody tr.even td:nth-of-type(4) span:nth-of-type(2) span:nth-of-type(1)')){
			let value = tdNode.textContent;
			value = value.replaceAll(".", "").replace(",",".");
			value = parseFloat(value);
			if(value>0){
				posSum += value;
			}else{
				negSum += value;
			}
		}

		let sumNode = document.querySelector('#depotOverviewTable tbody tr:last-of-type td:nth-of-type(3)');
		let newNode = self.htmlToElement('<span class="betrag pos">(Pos.Sum: '+self.priceFormatter(posSum)+' EUR)</span>');
		sumNode.appendChild(newNode);
		newNode = self.htmlToElement('<span class="betrag neg">(Neg.Sum: '+self.priceFormatter(negSum)+' EUR)</span>');
		sumNode.appendChild(newNode);
	}


	self.visualizeStockTransactions = function(data){
		if(data.srcElement.parentElement.querySelector('.se-isin-details-holder') != null) return;
		// console.log(data);

		const isin = data.detail;
		self.currentChart?.destroy();
		document.querySelector('.se-isin-details-holder')?.remove();
		let newNode = self.htmlToElement('<div class="se-isin-details-holder se-isin-details-holder-'+isin+'"><div class="btn_close" onclick="document.querySelector(\'.se-isin-details-holder\').remove();"></div><div class="se-isin-details"></div><canvas id="se-isin-details-chartjs" width="400" height="400"></canvas></div>');
		data.srcElement.parentElement.appendChild(newNode);

		// aggregate data from stock storage [{x:'2016-12-25', y:20}, {x:'2016-12-26', y:10}]
		let stockData = {
			datasets: [{
				label: isin,
				data: self.stockData[isin].transactions.slice().reverse().map(k => {return {x: k.transactionDate + " " + k.transactionTime, y: k.ownedAmountAtThatTime}}),
				lineTension: 0
			}]
		};

		const chartCtx = data.srcElement.parentElement.querySelector('.se-isin-details-holder-' + isin + ' #se-isin-details-chartjs');
		  self.currentChart = new Chart(chartCtx, {
			type: 'line',
			data: stockData,
			options: {
				scales: {
					xAxes: [{
						type: 'time',
						time: {
							displayFormats: {
								quarter: 'MMM YYYY'
							}
						}
					}],
					y: {
						ticks: {
							// Include a dollar sign in the ticks
							callback: function(value, index, values) {
								return value + " Stück";
							}
						}
					}
				},
				plugins: {
					title: {
						display: true,
						text: "Besitz von \"" + self.stockData[isin].name + "\" Aktien",
					}
				}
			}
		});
		
	}

	self.insertNonPrintedStocks = function(alreadyPrintedStocks){
		let referenceNode = document.querySelector('#tabContentDiv .musterdepot_table');
		let newNode = self.htmlToElement('<div id="historic-summary" class="musterdepot_table"></div>');
		referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
		newNode = self.htmlToElement('<div class="musterdepot_table"><table id="historic-table" class="display" width="100%"></table></div>');
		referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
		const filteredStockKeys = Object.keys(self.stockData).filter(key => !alreadyPrintedStocks.includes(key));
		var dataSet = filteredStockKeys.map((key) => [
			key + "\n" + self.stockData[key].wkn, 
			self.stockData[key].name, 
			self.stockData[key].maxOwnedAmount, 
			self.stockData[key].transactions.length, 
			self.stockData[key].transactions[0].transactionDate, 
			self.stockData[key].totalAmount
		]);

		$('#historic-table').DataTable( {
			data: dataSet,
			dom: 'lripft',
			order: [[ 1, "asc" ]],
			columns: [
				{ title: "ISIN" },
				{ title: "Name" },
				{ title: "Max Ever Owned" },
				{ title: "#transactions" },
				{ title: "Latest transaction",
				render: function(data, type) {
					if (type === 'display') {
						return data;
					}
 
					return new moment(data,"DD.MM.YYYY").unix();
				} },
				{ title: "Total",
					render: function(data, type) {
						if (type === 'display') {
							return  '<span class="'+(data > 0?'pos':'neg')+'">'+self.priceFormatter(data)+'</span>';
						}
	 
						return data;
					}
				}
			]
		} );


		let negSum = filteredStockKeys.filter(key => self.stockData[key].totalAmount < 0).reduce((a, b) => a + (self.stockData[b]['totalAmount'] || 0), 0);
		let posSum = filteredStockKeys.filter(key => self.stockData[key].totalAmount >= 0).reduce((a, b) => a + (self.stockData[b]['totalAmount'] || 0), 0);
		document.querySelector('#historic-summary').innerHTML = '<span>Alle Verluste:</span> <span class="neg">'+self.priceFormatter(negSum)+'</span> <br/> <span>Alle Gewinne:</span> <span class="pos">'+self.priceFormatter(posSum)+'</span>';
	}

	self.numberFormatter = function(inputFloat){
		let stringAmount = (inputFloat).toString();
		stringAmount = stringAmount.replace('-','');
		let splittedAmount = stringAmount.split('.');
		let cleaned = "";
		for(let a = splittedAmount[0].length-1,i=0; a > -1;cleaned = splittedAmount[0][a] + ((i%3 == 0 && i!== 0 && a !== splittedAmount[0].length-1)?'.':'')  + cleaned,a--,i++);

		return cleaned + ((splittedAmount.length > 1) ? "," + (splittedAmount[1].length == 1 ? splittedAmount[1] + '0': splittedAmount[1]): '');
	}
	self.priceFormatter = function(inputFloat){
		let stringAmount = (Math.round((inputFloat + Number.EPSILON) * 100) / 100).toString();
		stringAmount = stringAmount.replace('-','');
		let splittedAmount = stringAmount.split('.');
		let cleaned = "";
		for(let a = splittedAmount[0].length-1,i=0; a > -1;cleaned = splittedAmount[0][a] + ((i%3 == 0 && i!== 0 && a !== splittedAmount[0].length-1)?'.':'')  + cleaned,a--,i++);

		return (inputFloat > 0 ? '+': '-')+ cleaned + ((splittedAmount.length > 1) ? "," + (splittedAmount[1].length == 1 ? splittedAmount[1] + '0': splittedAmount[1]): ',00');
	}

	self.htmlToElement = function(html) {
		var template = document.createElement('template');
		html = html.trim(); // Never return a text node of whitespace as the result
		template.innerHTML = html;
		return template.content.firstChild;
	}

	self.updateTradingViewStocks = async function(data){
		let depot = data.depot;
		let stocks = data.stocks;
		let exchange = data.exchange;

		let symbols = [];
		// get all current stocks
		response = await fetch('https://www.tradingview.com/api/v1/symbols_list/custom/', {
			method: 'get'
		});
		if(response.status == 200 ){
			let json = JSON.parse(await response.text());
			if(json != null && typeof json === 'object' && json[0].id != null){
				// filter current depot
				let depotJson = json.filter(a => a.id === depot);
				if(depotJson.length > 0){
				  symbols = depotJson[0].symbols;
				}
			}
		}
	
		// now send delete requests
		let success = true;
		let counter = 0;
		if(symbols.length > 0){
			success = false;
			for(symbol of symbols){
				self.reportStockTransfer('tradingView', ++counter + "/" + symbols.length + ": deleting '" + symbol + "'...");
				let response = await fetch('https://www.tradingview.com/api/v1/symbols_list/custom/' + depot + '/remove/', {
					method: 'POST', 
					credentials:'include',
					headers: {
					'Content-Type': 'application/json',
			
					},
					body: JSON.stringify([symbol])
				}).then(result => {success = true})
				.catch(error => {console.log('error============:', error); success = false;});
			}
		}


		if(success){
			counter = 0;
			// transfer current stocks
			for(let stock of stocks){
			  	counter++;
				// search stock
				let stockNameCleaned = stock.name.replaceAll(/\,|\-/ig," ");
				let urlPattern = 'https://symbol-search.tradingview.com/symbol_search/?text='+stockNameCleaned+'&exchange=FWB&type=stock&domain=production';
				response = await fetch(urlPattern, {
					method: 'GET'
				});
				if(response.status == 200 ){
					let json = JSON.parse(await response.text());
					if(json != null && typeof json === 'object' && json.length > 0 && json[0].symbol != null){
						// add stock, send append request
						response = await fetch('https://www.tradingview.com/api/v1/symbols_list/custom/' + depot + '/append/', {
							method: 'POST', 
							credentials:'include',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify([exchange + ":" + json[0].symbol])
						}).then(result => {})
						.catch(error => console.log('error============:', error));
						self.reportStockTransfer('tradingView', counter + "/" + stocks.length + ": '" + stock.name + "' transfered");
					}
				}
				
				 
	
				  
			}
			console.log('DONE!')
			self.reportStockTransfer('tradingView', "finished");
		}
	
		return true;
	  };

	self.reportStockTransfer = function(platform, report){
		chrome.extension.sendMessage({type:"report-stock-transfer", platform:platform, report: report}, function(response) {
			console.log('got confirmation from background: ' + response);
			return true;
		});
	}


	self.init = function(){
		self.intervals['readyStateCheckInterval'] = setInterval(function() {
			if (document.readyState === "complete") {
				clearInterval(self.intervals['readyStateCheckInterval']);
				console.log("Hello, inject.js initilized...");

				// init tradingview
				if(window.location.hostname.indexOf("tradingview") > -1){
					console.log('this is tradingview');
					// register receiver from background.js
					chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
						switch(message.type) {
							case "update-tradingview-depot":
								self.updateTradingViewStocks(message);
								sendResponse(true);
							break;
							default: 
								console.log('received in frontend');
							break;
						}
						return true;
					});

					


				}else{ // init smartbroker

					document.addEventListener('showIsinDetails', self.visualizeStockTransactions, false);
					self.intervals['keepActive'] = setInterval(self.keepActive, 60000);
					self.intervals['checkForLogoutPage'] = setInterval(self.checkForLogoutPage, 1000);
					self.intervals['checkForLoginPage'] = setInterval(self.checkForLoginPage, 1000);
					self.intervals['checkForChanges'] = setInterval(self.checkForChangesInterval, 30000);
					self.writeStyles();
					self.replaceMenuPoints();
					
	
	
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
								case "readOutPastStocks":
									self.readOutPastStocks().then(resultStocks => {
										const lengthOfTransactions = Object.keys(resultStocks).length;
										if(lengthOfTransactions > 0){
											console.log("collected "+Object.keys(resultStocks).length+" transactions");
										}
										sendResponse(resultStocks);
									});
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
					
					// request transferedStocks
					chrome.extension.sendMessage({type:"get-track-stock-transfers"}, function(response) {
						console.log('got settings from background');
						self.renderAdditionalInformation(response.data);
						// read out current stock if possible and save
						let stocks = self.readOutStocks();
						chrome.extension.sendMessage({type:"save-current-stocks", stocks: stocks}, function(response) {
							console.log('got confirmation from background: ' + response);
							return true;
						});
						return true;
					});

				}

				console.log('Smartbroker Extension initilized..');
			}
		}, 10);
		return self;
	}

	

	return self;
})();
window['SmartbrokerEnhancer'].init();