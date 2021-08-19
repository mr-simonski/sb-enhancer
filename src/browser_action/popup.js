var Depot = function (data) {
    var self = this;

    self.name = ko.observable('');
    self.code = ko.observable('');

    if (data != null) {
        self.name(data.name);
        self.code(data.code);
    }
}

var viewModelModel = function(){
    var self = this;
    self.enableChangeCheck = ko.observable(true);
    self.loginId = ko.observable("");
    self.stockTransactionLength = ko.observable(0);
    self.finNetLoggedIn = ko.observable(false);
    self.finNetDepots = ko.observableArray(); 
    self.finNetSelectedDepot = ko.observable("");
    self.finNetTransferStatus = ko.observable("Checking for login status on finanzen.net");
    self.tradingViewLoggedIn = ko.observable(false);
    self.tradingViewDepots = ko.observableArray(); 
    self.tradingViewSelectedDepot = ko.observable("");
    self.tradingViewExchange = ko.observable("FWB");
    self.tradingViewTransferStatus = ko.observable("Checking for login status on TradingView");

    self.sendSettings = function(data){
        chrome.tabs.query({active: true, currentWindow: true},function(tabs) {
            let tab = tabs[0];
            chrome.tabs.sendMessage(tab.id, {type:"config-change", data: data}, function(response){
                console.log('got tabs response:');
                console.log(response);
                return true;
            });            
            return true;
        });
        chrome.runtime.sendMessage({type:"config-change", data: data}, function(response) {
            console.log('got runtime response:');
            console.log(response);
            return true;
        });
        return true;
    };

    self.fullConfig = ko.computed(function() {
        var returnValue =  {
            checkForChanges: self.enableChangeCheck(),
            loginId: self.loginId(),
            finNetSelectedDepot: self.finNetSelectedDepot()
        };
        if (!ko.computedContext.isInitial()){
            self.sendSettings(returnValue);
        }
        return returnValue;
    }, self).extend({ deferred: true });


    self.transferStocks = function(platform){
        switch(platform){
            case "tradingView":
                chrome.extension.sendMessage({type:"transfer-stocks", data: {platform: platform, selectedDepot: self.tradingViewSelectedDepot(), exchange: self.tradingViewExchange()}}, function(response) {});
                break;
            default:
                chrome.extension.sendMessage({type:"transfer-stocks", data: {platform: platform, selectedDepot: self.finNetSelectedDepot()}}, function(response) {});
                break;
        }
    }
    

    self.getDepots = async function(){
        // first check finanzen.net
        let response = await fetch('https://www.finanzen.net/depot/depot.asp', {
            method: 'get'
        });
        self.finNetTransferStatus('');
        if(response.status == 200){
            self.finNetLoggedIn(true);
            var tmp = document.implementation.createHTMLDocument();
            tmp.body.innerHTML = await response.text();
            for(n of tmp.querySelector('#form_depotauswahl').querySelectorAll('table select option')){
                self.finNetDepots.push(new Depot({name:n.text, code: n.value.split('\|')[0]}));
            }
        }else{
            self.finNetLoggedIn(false);
        }

        // second check TradingView
        response = await fetch('https://www.tradingview.com/api/v1/symbols_list/custom/', {
            method: 'get'
        });
        self.tradingViewTransferStatus('');
        if(response.status == 200 ){
            let json = JSON.parse(await response.text());
            if(json != null && typeof json === 'object' && json[0].id != null){
                self.tradingViewLoggedIn(true);
                for(let n of json){
                    self.tradingViewDepots.push(new Depot({name:n.name, code: n.id}));
                }
            }else{
                self.tradingViewLoggedIn(false);
            }
        }else{
            self.tradingViewLoggedIn(false);
        }

        
    }

    self.collectStockTransferHistory = function(){
        chrome.extension.sendMessage({type:"track-stock-transfers"}, function(response) {
            if(response != null && response.answer != null && response.answer === 'reported' && response.data > 0){
                self.stockTransactionLength(response.data);
                document.querySelector('#collectStockTransferHistory').disabled = false;
            }{
                document.querySelector('#collectStockTransferHistory').textContent = "ERROR: Please try again!";        
            }
        });
        document.querySelector('#collectStockTransferHistory').disabled = true;
        document.querySelector('#collectStockTransferHistory').textContent = "Running..";
    }
    self.deleteStockTransferHistory = function(){
        chrome.extension.sendMessage({type:"delete-stock-transfers"}, function(response) {
           self.stockTransactionLength(0);
        });
        self.stockTransactionLength(0);
    }
}

var viewModel = new viewModelModel();
// request settings
chrome.extension.sendMessage({type:"get-config"}, function(response) {
    console.log('got settings from background');
    if(!!response.data && Object.keys(response.data).length > 0){
        viewModel.enableChangeCheck(response.data.checkForChanges);
        viewModel.loginId(response.data.loginId);
        viewModel.finNetSelectedDepot(response.data.finNetSelectedDepot);
        viewModel.stockTransactionLength(response.data.stockTransactionLength);
    }
    ko.applyBindings(viewModel, document.getElementById('main'));
    // init
    viewModel.getDepots();
    return true;
});

chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        console.log("Popup: " + sender.tab ? "from a content script:" + sender.tab?.url : "from the extension");

        switch(message.type) {
        case "transfer-update":
            if(message.data.message === 'finished'){
                message.data.message = 'DONE!';
                setTimeout(function(){viewModel.finNetTransferStatus('');viewModel.tradingViewTransferStatus('');}, 5000);
            }
            (message.data.platform !== 'tradingView') ? viewModel.tradingViewTransferStatus(message.data.message) : viewModel.finNetTransferStatus(message.data.message);
        break;
        
        default: 
            console.log('received something undefined in popup.js');
        break;
        }
        return true;
    }
);

  

