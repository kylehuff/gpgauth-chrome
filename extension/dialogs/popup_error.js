    function parseUrl(url) {
        var re = /^((\w+):\/\/\/?)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#;\|]+)?([;\|])?([^\?#]+)?\??([^#]+)?#?(\w*)/gi
        result = re.exec(url);
        return { 'url': result[0],
            'proto_full': result[1],
            'proto_clean': result[2],
            'domain': result[6],
            'port': result[7],
            'path': result[8],
            'query': result[11],
            'anchor': result[12]
        }
    }
    
    function callDoUserLogin(response) {
        response.result['valid'] = 'override';
        code = "response = {};" +
            "response.result = {};" +
            "response.result['valid'] = 'override';" +
            "gpgAuth.serverResult(response);";
        chrome.tabs.executeScript(
            window.response.result.validation.tab.id, 
            {'code': code}
        );
    }
    
    function initiateImport(){
        chrome.tabs.getSelected(null, function(_tab) {
            result = parseUrl(_tab.url);
            domain = result['domain'];
            console.log(_tab.url, domain);
            chrome.extension.sendRequest({msg: 'doKeyImport', 'tab': _tab, 'domain': domain},
                function(response) {
                    if (response.result.valid) {
                        document.getElementById("title").innerHTML = "Please review these " + response.result.msg['considered'] + " Keys -";
                        // display the imported key and ask for trust
                        import_result = "";
                        console.log(response.result.msg);
                        if (!response.result.msg['error']) {
                            bg = chrome.extension.getBackgroundPage();
                            for (key_item in response.result.msg['imports']) {
                                keylist = bg.plugin.getDomainKey(response.result.msg['imports'][key_item]['fingerprint']);
                                for (key_obj in keylist) {
                                    key = keylist[key_obj];
                                    import_result += "<div class='imported_key'>Key 0x" +
                                            key.fingerprint.substr(-8, 8) + "<br><br>Domains:<br>";
                                    for (uid_item in key.uids) {
                                        import_result += "&nbsp;&nbsp;" + key.uids[uid_item].uid + "<br>";
                                    }
                                    import_result += "<br><br><input type='button' value='Set Trust' onclick='window.location=\"" + chrome.extension.getURL('options.html') + "?tab=2&openkey=" + key.fingerprint.substr(-16, 16) + "&strip=true&helper=signuids\";'/\></div>";
                                }
                            }
                            addEventListener("unload", function (event) {
                                bg.chrome.tabs.executeScript(window.response.result.validation.tab.id, 
                                {'code': 'window.location.reload();' } );
                            }, true);
                        } else {
                            import_result = "There was a problem performing the import.<br><br>";
                            import_result += response.result.msg['error'];
                        }
                        document.getElementById('description').innerHTML = import_result;
                    } else {
                        document.getElementById('description').innerHTML = "Unable to retrieve the or import the public key.<br><br>";
                        document.getElementById('description').innerHTML += response.result.msg.error;
                    }
                }
            );
        });
    }

    chrome.tabs.getSelected(null, function(_tab) {
        chrome.extension.sendRequest({msg: 'getPopupData', 'tab': _tab},
            function(data_response) {
                chrome.extension.sendRequest({msg: 'getPopupError', 'tab': _tab},
                    function(error_response) {
                        if (error_response.result.errorno) {
                            window.response = data_response;
                            title = document.getElementById('title');
                            desc = document.getElementById('description');
                            title.innerHTML = error_response.result.error;
                            switch(error_response.result.errorno) {
                                case 1:
                                    import_msg = (error_response.result.headers['X-GPGAuth-Pubkey-URL']) ? "Click on the \"import\" button below if you would like to attempt to import it, or log in without verifying the server.<br><br><div id='options'><input type='button' value='Login without verifying' onclick='callDoUserLogin(window.response);window.close();'/\><input type='button' value='Import' onclick='initiateImport();'/\>" : "We were unable to locate this servers public key for import.";
                                    desc.innerHTML = "You do not have the public key for this domain.<br><br>" + import_msg + "</div>";
                                    break;
                                case 2:
                                    desc.innerHTML = "In order for gpgAuth to determine the trust for this domain, you must enable at least 1 private key in the options window<br><br><div id='options'><input type='button' onclick='window.location = \"" + chrome.extension.getURL('options.html') + "?tab=1&helper=enable\";' value=\"Click here to go to the options page\"/\></div>";
                                    break;
                                case 3:
                                    desc.innerHTML = "In order to perform verification of a domain, gpgAuth must know your desired default key.<br><br><div id='options'><input type='button' onclick='window.location = \"" + chrome.extension.getURL('options.html') + "?tab=1&helper=default\"' value=\"Click here to go to the options page\"/\></div>";
                                    break;
                                case 4: // The server does not have the users reported public key
                                    desc.innerHTML = "The server was unable to find or otherwise access your Public Key; It is possible your key is expired or perhaps the server does not have your Public Key on file.";
                                    break;
                                case 5: // Unable to decrypt token (Bad or cancelled passphrase)
                                    desc.innerHTML = "Unable to decrypt the token provided by the server;<br><br>The passphrase was incorrect or the passphrase dialog may have been cancelled.<br><br><div id='options'><input type='button' value='Retry Login' onclick='callDoUserLogin(window.response);window.close();'/\></div>";
                                    break;
                                case 6: // Token format does not match
                                    desc.innerHTML = "The token provided by the server is either empty, or it does not match the required format.";
                                    break;
                                case 7: // The server could not locate an account associated with the key id
                                    desc.innerHTML = "The server was unable to locate a user account associated with the provided key.";
                                    break;
                            }
                        }
                    }
                )
            }
        )
    });
