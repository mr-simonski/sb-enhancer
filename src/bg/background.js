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

  self.transferStocks = async function(){
    // read out stocks
    chrome.tabs.query({ windowType: 'normal',url:'https://b2b.dab-bank.de/smartbroker/Depot/Depotuebersicht/'}, async function(tabs) {
        let tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, {type:"readOutStocks"}, async function(stocks){
            if(typeof stocks !== 'undefined' && stocks.length > 0){
                // delete old stocks
                let success = await self.deleteStocks(self.finNetSelectedDepot);
                if(success){
                    let counter = 0;
                    // transfer current stocks
                    for(let stock of stocks){
                      counter++;
                        // TGT
                        await self.transferSingleStock(self.finNetSelectedDepot, stock.wkn, 'TGT', stock.amount, stock.buyRate, stock.buyDate, stock.totalPrice);
                        self.reportStockTransfer(counter + "/" + stocks.length + ": '" + stock.name + "' transfered");
                    }
                    console.log('DONE!')
                    self.reportStockTransfer("finished");
                }
            }else{
                console.error('Was not able to transfer');
            }
            return true;
        });            
        return true;
    });
  };

  self.reportStockTransfer = function(message){
    let data = {};
    data['message'] = message;
    chrome.runtime.sendMessage({type:"transfer-update", data: data}, function(response) {
        console.log('got runtime response:');
        console.log(response);
        return true;
    });
  }

  self.transferSingleStock = async function(depot, wkn, exch, amount, buyRate, buyDate, totalPrice){
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

  self.deleteStocks = async function(depot){
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
  



  self.init = function(){
    chrome.runtime.onMessage.addListener(
      function(message, sender, sendResponse) {
        console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
    
        switch(message.type) {
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
            self.finNetSelectedDepot = message.data.finNetSelectedDepot;
            self.transferStocks();
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


