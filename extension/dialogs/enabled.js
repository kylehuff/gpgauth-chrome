/* <![CDATA[ */
if (typeof(jQuery)!='undefined') { var jq = jQuery.noConflict(true); }

jq(function() {
    function callDoUserLogin(response) {
        response.result['valid'] = 'override';
        code = "response = {};" +
            "response.result = {};" +
            "response.result['valid'] = 'override';" +
            "gpgauth.client.serverResult(response);";
        chrome.tabs.executeScript(
            window.response.result.validation.tab.id, 
            {'code': code}
        );
    }
    console.log(chrome.extension);
    chrome.tabs.getSelected(null, function(_tab) {
        console.log(_tab);
        chrome.extension.sendRequest({msg: 'getPopupData', tab: _tab},
            function(response) {
                console.log(response);
                window.response = response;
                container = document.getElementById('server_validation');
                info_element = document.getElementById('info');
                options_element = document.getElementById('description');
                for (param in response.result.popup_data) {
                    info_element.innerHTML += param + ": " + response.result.popup_data[param] + "<br/\>";
                }
                if (response.result.validation['server_validated'] == true) {
                    container.style.backgroundColor = "#2C2";
                    container.style.border = "1px solid #2E2";
                    options_element.innerHTML += "The server has validated itself against your keyring<br/\><br/\>";
                    options_element.innerHTML += "<div id='options'><input type='button' value='Log in' class='doUserLogin'/\>" +
                            "<input type='button' class='cancel' value='cancel'/\></div>";
                } else {
                    if (response.result.validation['domain_key_trust'] > 0) {
                        container.style.backgroundColor = "#F58400";
                        container.style.border = "1px solid #FF8400";
                    } else if (response.result.validation['domain_key_trust'] < 0) {
                        container.style.backgroundColor = "#E31";
                        container.style.border = "1px solid #F31";
                    }
                    options_element.innerHTML += response.result.validation['trust_reason'] + "<br/\><br/\>";
                    if (response.result.validation['configured_trust'] != 
                          response.result.validation['domain_key_trust']) {
                        options_element.innerHTML += "The Public Key associated with this domain has a trust value of " +
                            response.result.validation['domain_key_trust'] + ", which does not meet the minimum value in " +
                            "your prefrences.<br/\><br/\>Your configured value is " + 
                            response.result.validation['configured_trust'] + ".<br/\><br/\>";
                        if (response.result.validation['domain_key_trust'] > -1) {
                            options_element.innerHTML += "Please choose an option to proceed:<br/\>" +
                            "&nbsp;&nbsp;&nbsp;&nbsp;Log in anyway (not recommended)<br/\>" +
                            "&nbsp;&nbsp;&nbsp;&nbsp;Modify your configured trust level in the options (not recommended)<br/\>" +
                            "&nbsp;&nbsp;&nbsp;&nbsp;Sign the key and specify a level of trust (best option)<br/\><br/\>";
                        }
                        options_element.innerHTML += "<div id='options'><input type='button' value='Add/Remove Signatures' class='addRemoveSigs'/><input type='button' value='Log in anyway' class='doUserLogin'/>" +
                            "<input type='button' value='cancel' class='cancel'/></div>";
                    }
                }
                jq('.doUserLogin').click(function() {
                    callDoUserLogin(window.response);
                    window.close();
                });
                jq('.addRemoveSigs').click(function() {
                    window.location = chrome.extension.getURL('options.html') + "?tab=2&openkey=" + response.result.popup_data["Public Key"] + "&helper=none";
                });
                jq('.cancel').click(function() {
                    window.close();
                });
            }
        );
    }); 
});
