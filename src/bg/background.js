window.SmartbrokerEnhancerBackground = new (function () {
	var self = this;
	

  self.collectStockTransactionHistory = function(){

    return new Promise(function(resolve, reject) {
        // read out stocks
        chrome.tabs.query({ windowType: 'normal',url:'https://b2b.dab-bank.de/smartbroker/Depot/Auftragsuebersicht/'}, function(tabs) {
          let tab = tabs[0];
          chrome.tabs.sendMessage(tab.id, {type:"readOutPastStocks"}, function(stocks){
            console.log(stocks);
            if(typeof stocks !== 'undefined' && Object.keys(stocks).length > 0){
                
              // add received stocks
              chrome.storage.local.get([ "stockTransactions"], function(savedStocks){
                // savedStocks is: { "stockTransactions": stocks}
                console.log(savedStocks);
                if(savedStocks == null || savedStocks.stockTransactions == null || typeof savedStocks.stockTransactions !== 'object' ){
                  savedStocks = {};
                  savedStocks['stockTransactions'] = {};
                }
                for(let transactionId of Object.keys(stocks)){
                  if(savedStocks.stockTransactions[transactionId] == null){
                    savedStocks.stockTransactions[transactionId] = stocks[transactionId];
                  }else{
                    console.log(transactionId + ' already in');
                  }
                }
                chrome.storage.local.set(savedStocks, function(){
                  console.log('stocks saved');
                  resolve(savedStocks.stockTransactions);
                });
                return true;
              });

            }else{
                console.error('Was not able to receive stocks');
            }
            return true;
          });            
          return true;
        });
    });
  };

  self.deleteStockTransactionHistory = function(){
    chrome.storage.local.set({ "stockTransactions": {}}, function(){
      console.log('stocks deleted');
      return true;
    });
    return true;
  };

  self.transferStocks = async function(platform, selectedDepot, exchange){
    // read out stocks
    let stocks = await self.readStorage('currentStocks');
    stocks = stocks.currentStocks;
    if(stocks.length > 0){
        self.doTransfer(platform, selectedDepot, stocks, exchange);
      }else{
        chrome.tabs.query({ windowType: 'normal',url:'https://b2b.dab-bank.de/smartbroker/Depot/Depotuebersicht/'}, async function(tabs) {
          let tab = tabs[0];
          chrome.tabs.sendMessage(tab.id, {type:"readOutStocks"}, async function(stocks){
            self.doTransfer(platform, selectedDepot, stocks, exchange);
            return true;
          });            
          return true;
      });

    }
  };

  self.doTransfer = async function(platform, selectedDepot, stocks, exchange){
    if(typeof stocks !== 'undefined' && stocks.length > 0){

      // FINANZEN.NET
      if(platform === 'finNet'){
        // delete old stocks
        let success = await self.deleteFinNetStocks(selectedDepot);
        if(success){
            let counter = 0;
            // transfer current stocks
            for(let stock of stocks){
              counter++;
                // TGT
                await self.transferSingleFinNetStock(selectedDepot, stock.wkn, 'TGT', stock.amount, stock.buyRate, stock.buyDate, stock.totalPrice);
                self.reportStockTransfer('finNet', counter + "/" + stocks.length + ": '" + stock.name + "' transfered");
            }
            console.log('DONE!')
            self.reportStockTransfer('finNet', "finished");
        }


      // TRADINGVIEW
      }else if(platform === 'tradingView'){
        // delete old stocks
        chrome.tabs.query({ windowType: 'normal',url:'https://www.tradingview.com/*'}, function(tabs) {
          console.log(tabs.length + " tabs found");
          let tab = tabs[0];
          chrome.tabs.sendMessage(tab.id, {type:"update-tradingview-depot", depot: selectedDepot, stocks: stocks, exchange:exchange}, function(done){
            console.log("done");
          });         
          return true;
        });
      }
    }else{
        console.error('Was not able to transfer');
    }
  }

  self.reportStockTransfer = function(platform, message){
    let data = {};
    data['message'] = message;
    data['exchange'] = platform;
    chrome.runtime.sendMessage({type:"transfer-update", data: data}, function(response) {
        console.log('got runtime response:');
        console.log(response);
        return true;
    });
  }

  self.transferSingleFinNetStock = async function(depot, wkn, exch, amount, buyRate, buyDate, totalPrice){
    console.log('+--------------- Start to add ' + wkn);
    let response = await fetch('https://www.finanzen.net/depot/depot_suchergebnis.asp?stAction=suchen&stmode=suchen&inDepottypNr=1&inSubID=&pkdepnr='+depot+'&stDepotSuche=' + wkn, {
        method: 'get'
    });
    console.log('search for WKN: ' + response.status);
    let text = await response.text();
    let re = "(?<=input type=\"checkbox\" name=\"ardepothinzu\" value=\").*?\"";
    var isinCode = text.match(re);
    isinCode = isinCode[0];
    isinCode = isinCode.substr(0, isinCode.length -1);

    console.log('Got ISIN Code: ' + isinCode);
    response = await fetch('https://www.finanzen.net/depot/depot.asp?stAction=uebernehmen&pkdepnr='+depot+'&inSubID=2&ardepothinzu=' + isinCode, {
        method: 'get'
    });
    console.log('Prepare: ' + response.status);
    
    isinCode = isinCode.substr(0, isinCode.length-6);
    let urlPart = response.url;
    re = "(?<==)\\d+$";
    urlPart = urlPart.match(re)[0];
    
    let urlToSend = 'https://www.finanzen.net/depot/depot.asp?pkdepnr='+depot+'&stmode=wert_bearbeiten&inSubID=2&pkdepdatennr='
    +urlPart+'&stAction=uebernehmen&ardepdatennr='+urlPart+'&arboerse='+exch+'&aranzahl='+amount+'&arkkursmanuel='+self.encodedFloat(buyRate)
    +'&arkdatum='+buyDate+'&arkaufwert='+self.encodedFloat(totalPrice)+'&inMyNews=1&isIsin=' + isinCode;
    console.log(urlToSend);
    
    result = await fetch(urlToSend, {
        method: 'get'
    });
    console.log('Done: ' + response.status);
  };

  self.encodedFloat = function(floatPrice){
      return encodeURIComponent(floatPrice.toString().replace('.',','));
  };

  self.deleteFinNetStocks = async function(depot){
    let response = await fetch('https://www.finanzen.net/depot/depot.asp?inSubID=2&pkdepnr=' + depot, {
        method: 'get'
    });
    let text = await response.text();
    let re = /'(?<=confirm_delete\(\').*?(?=\')'/g;
    var matches = text.match(re);
    if(!!matches && matches.length > 0){
      counter = 0;
      for (let deleteUrl of matches){
          deleteUrl = deleteUrl.substr(1, deleteUrl.length-2).replaceAll('&amp;','&');
          deleteUrl = 'https://www.finanzen.net' + deleteUrl;
          
          response = await fetch(deleteUrl, {
              method: 'get'
          });
          console.log("deleted: " +deleteUrl + ": " + response.status);
          self.reportStockTransfer("deleting " + (counter++) + "/" + matches.length);
      }
    }
    return true;
  };
  
  
  self.readStorage = function(key) {
    return new Promise((resolve, reject) => {
        if (key != null) {
            chrome.storage.local.get(key, function (obj) {
                resolve(obj);
            });
        } else {
            reject(null);
        }
    });
  }



  self.init = function(){
    chrome.runtime.onMessage.addListener(
      function(message, sender, sendResponse) {
        console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
    
        switch(message.type) {
          case "report-stock-transfer":
            console.log("received report")
            self.reportStockTransfer(message.platform, message.report);
            
          break;
          case "activity":
            console.log("received activity change")
            chrome.notifications.create(
              "Smartbroker Alert",
              {
                type: "basic",
                iconUrl: "../../icons/60.jpg",
                title: "Something changed",
                message: "The list of recent activities changed!",
              },
              function () {}
              );
            sendResponse({answer: "reported"});
          break;
          case "config-change":
            console.log("received config change")
            chrome.storage.local.set({ "configToStore": message.data}, function(){
              console.log('config saved');
            });
            break;
          case "save-current-stocks":
            console.log("received current stocks");
            console.log(message);
            chrome.storage.local.set({ "currentStocks": message.stocks}, function(){
              console.log('stocks saved');
            });
            break;
          case "get-config":
            console.log("config request received")
            chrome.storage.local.get([ "configToStore"], function(configResult){
              chrome.storage.local.get([ "stockTransactions"], function(stockTransactionsResult){
                configResult.configToStore.stockTransactionLength = stockTransactionsResult != null && stockTransactionsResult.stockTransactions != null && typeof stockTransactionsResult.stockTransactions === 'object' ? Object.keys(stockTransactionsResult.stockTransactions).length : 0;
                console.log(configResult.configToStore);
                sendResponse({answer: "reported", data: configResult.configToStore});
              });
            });
            break;
          case "transfer-stocks":
            console.log("transfer of stocks requested");
            self.transferStocks(message.data.platform, message.data.selectedDepot, message.data.exchange);
            break;
          case "track-stock-transfers":
            console.log("collection task for all transactions of stocks requested");
            self.collectStockTransactionHistory().then(resultStocks => {
              sendResponse({answer: "reported", data: Object.keys(resultStocks).length});
            });
            break;
          case "delete-stock-transfers":
            console.log("deletion of history of stock transfers requested");
            self.deleteStockTransactionHistory();
            break;
          case "get-track-stock-transfers":
            console.log("stockTransactions request received")
            chrome.storage.local.get([ "stockTransactions"], function(result){
              console.log(result);
              sendResponse({answer: "reported", data: result});
            });
            break;
          default: 
            console.log('received something undefined in background.js');
          break;
        }
        return true;
      }
    );

    
  }



  return self;

})().init();


