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
    self.finNetLoggedIn = ko.observable(false);
    self.finNetDepots = ko.observableArray(); 
    self.finNetSelectedDepot = ko.observable("");
    self.finNetTransferStatus = ko.observable("Checking for login status on finanzen.net");

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


    self.transferStocks = function(){
        chrome.extension.sendMessage({type:"transfer-stocks", data: {finNetSelectedDepot: self.finNetSelectedDepot()}}, function(response) {
           
        });
    }
    

    self.getFinanzenNetDepot = async function(){
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
    }
    ko.applyBindings(viewModel, document.getElementById('main'));
    // init
    viewModel.getFinanzenNetDepot();
    return true;
});

chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        console.log("Popup: " + sender.tab ? "from a content script:" + sender.tab?.url : "from the extension");

        switch(message.type) {
        case "transfer-update":
            if(message.data.message === 'finished'){
                viewModel.finNetTransferStatus('DONE!');
                setTimeout(function(){viewModel.finNetTransferStatus('');}, 5000);
            }else{
                viewModel.finNetTransferStatus(message.data.message);
            } 

        break;
        
        default: 
            console.log('received something undefined in popup.js');
        break;
        }
        return true;
    }
);

  

