    function callDoUserLogout(response) {
        response.result['valid'] = 'override';
        obj = response;
        
        code = "response = {};" +
            "response.result = { 'popup_data' : {}, 'validation' : {}};";
        for (param in response.result.popup_data) {
            code += "response.result['popup_data']['" + param + "'] = '" + response.result.popup_data[param] + "';";
        }
        for (param in response.result.validation) {
            if (response.result.validation[param].toString() == "[object Object]") {
                code += "response.result['validation']['" + param + "'] = {};";
                for (obj in response.result.validation[param]) {
                    code += "response.result['validation']['" + param + "']['" + obj + "'] = '" + response.result.validation[param][obj] + "';";
                }
            } else {
                code += "response.result['validation']['" + param + "'] = '" + response.result.validation[param] + "';";
            }
        }
        code += "response.result['valid'] = 'override';" +
        "gpgauth.client.logout(response);";
        chrome.tabs.executeScript(
            window.response.result.validation.tab.id, 
            {'code': code}
        );
    }

    chrome.tabs.getSelected(null, function(_tab) {
        chrome.extension.sendRequest({msg: 'getPopupData', tab: _tab},
            function(response) {
                window.response = response;
                container = document.getElementById('server_validation');
                info_element = document.getElementById('info');
                options_element = document.getElementById('description');
                for (param in response.result.popup_data) {
                    info_element.innerHTML += param + ": " + response.result.popup_data[param] + "<br/\>";
                }
                if (response.result.error) {
                    container.style.backgroundColor = "#E31";
                    container.style.border = "1px solid #F31";
                    options_element.innerHTML += response.result.error + '<br/\><br/\>';
                }
                if (response.result.validation['server_validated'] == true) {
                    container.style.backgroundColor = "#2C2";
                    container.style.border = "1px solid #2E2";
                    options_element.innerHTML += "The server has validated itself against your keyring and you are currently logged in.<br/\><br/\>";
                }
                if (response.result.validation['domain_key_trust'] > 0) {
                    container.style.backgroundColor = "#F58400";
                    container.style.border = "1px solid #FF8400";
                    options_element.innerHTML += response.result.validation['trust_reason'] + "<br/\><br/\>";
                } else if (response.result.validation['domain_key_trust'] < 0) {
                    container.style.backgroundColor = "#E31";
                    container.style.border = "1px solid #F31";
                    options_element.innerHTML += response.result.validation['trust_reason'] + "<br/\><br/\>";
                    options_element.innerHTML += "The server does not meet your minimum level of trust; but you have logged in anyway.<br/\><br/\>";
                }
                if (response.result.validation.headers['X-GPGAuth-Authenticated'] != false) {
                    options_element.innerHTML += "<div id='options'><input type='button' id='logout' value='logout'/\>" +
                        "<input type='button' id='close-dialog' value='close'/\></div>";
                    document.getElementById("logout").addEventListener("click", function() {
                        callDoUserLogout(window.response);
                        window.close();
                    });
                    document.getElementById("close-dialog").addEventListener("click", function() {
                        window.close()
                    });
                }
            }
        );
    }); 

