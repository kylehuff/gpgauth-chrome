/* <![CDATA[ */
if (typeof(gpgauth)=='undefined') { gpgauth = {}; }

var CLIENT_VERSION = '1.1.0';

var domain_trust_detail = {
        '-7': "The domain UID and/or domain key was signed by an expired key",
        '-6': "The domain UID and/or domain key was signed by a key that has been revoked",
        '-5': "The domain uid was signed by a disabled key",
        '-4': "The sinature has been revoked, disabled or is invalid",
        '-3': "The uid has been revoked, is disabled or is invalid",
        '-2': "The key belonging to the domain has been revoked, disabled or is invalid",
        '-1': "The domain UID was not signed by any enabled private key and fails web-of-trust",
        '0': "The UID of the domain key was signed by an ultimately trusted private key",
        '1': "The UID of the domain key was signed by an expired private key that is ultimately trusted",
        '2': "The UID of the domain key was signed by a private key that is other than ultimately trusted",
        '3': "The UID of the domain key was signed by an expired private key that is other than ultimately trusted",
        '4': "The domain key was signed (not the UID) by an ultimately trusted private key",
        '5': "The domain key was signed (not the UID) by an expired ultimately trusted key",
        '6': "The domain key was signed (not the UID) by an other than ultimately trusted private key",
        '7': "The domain key was signed (not the UID) by an expired other than ultimately trusted key",
        '8': "The domain key was not signed, but meets web of trust requirements (i.e.: signed by a key that the user trusts and has signed, as defined by the user preference of &quot;advnaced.trust_model&quot;)",
}

gpgauth.background = {

    init: function() {
        var _ = gpgauth.utils.i18n.gettext;
        var gnupghome = (gpgauth.preferences.gnupghome.get() != -1 &&
            gpgauth.preferences.gnupghome.get()) ? gpgauth.preferences.gnupghome.get() : "";

        if (!localStorage.config_complete) {
            // The configuration druid has not run, we need to start it.
            chrome.tabs.create({url: chrome.extension.getURL('druid.html')});
        }

        // information and source code for the plugin can be found here:
        //      https://github.com/kylehuff/webpg-npapi
        if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
            // if the plugin is already present, remove it from the DOM
            if (document.getElementById("webpgPlugin"))
                document.body.removeChild(document.getElementById("webpgPlugin"));
            var embed = document.createElement("embed");
            embed.id = "webpgPlugin";
            embed.type = "application/x-webpg";
            document.body.appendChild(embed);
        }

        gpgauth.plugin = document.getElementById("webpgPlugin");
        console.log("WebPG NPAPI Plugin valid: " + gpgauth.plugin.valid + "; version " + gpgauth.plugin.version);

        // Set the users preferred option for the GnuPG binary
        if (gpgauth.plugin.valid) {
            var gnupgbin = gpgauth.preferences.gnupgbin.get();
            if (gnupgbin.length > 1) {
                gpgauth.plugin.gpgSetBinary(gnupgbin);
                console.log("Setting GnuPG binary to user value: '" + gnupgbin + "'");
            }
            var gpgconf = gpgauth.preferences.gpgconf.get();
            if (gpgconf.length > 1) {
                gpgauth.plugin.gpgSetGPGConf(gpgconf);
                console.log("Setting GPGCONF binary to user value: '" + gpgconf + "'");
            }
        }
        
        if (gpgauth.plugin.valid && !gpgauth.plugin.webpg_status["error"]) {
            if (gnupghome.length > 0)
                console.log("Setting GnuPG home directory to user value: '" + gnupghome + "'");
            if (gpgauth.plugin.webpg_status.openpgp_valid)
                console.log("Protocol OpenPGP is valid; v" + gpgauth.plugin.webpg_status.OpenPGP.version);
            if (gpgauth.plugin.webpg_status.gpgconf_detected)
                console.log("Protocol GPGCONF is valid; v" + gpgauth.plugin.webpg_status.GPGCONF.version); 
            gpgauth.plugin.gpgSetHomeDir(gnupghome);
            gpgauth.plugin.addEventListener("keygenprogress", gpgauth.background.gpgGenKeyProgress, false);
            gpgauth.plugin.addEventListener("keygencomplete", gpgauth.background.gpgGenKeyComplete, false);

            /* Check to make sure all of the enabled_keys are private keys 
                this would occur if the key was enabled and then the secret key was deleted. */
            gpgauth.secret_keys = gpgauth.plugin.getPrivateKeyList();
            gpgauth.enabled_keys = gpgauth.preferences.enabled_keys.get();
            var secret_keys = gpgauth.secret_keys;
            var enabled_keys = gpgauth.enabled_keys;
            for (var key in enabled_keys){
                if (enabled_keys[key] in secret_keys == false){
                   gpgauth.preferences.enabled_keys.remove(enabled_keys[key]);
                }
            }
            console.log("gpgAuth background initialized");
        } else {
            if (gpgauth.plugin.valid == undefined) {
                gpgauth.plugin.webpg_status = {
                    "error": true,
                    "gpg_error_code": -1,
                    "error_string": _("WebPG Plugin failed to load"),
                    "file": "webpgPluginAPI.cpp",
                    "line": -1,
                }
            }
            // Hide the plugin element or it will FUBAR the content window
            //  on firefox.
            if (gpgauth.utils.detectedBrowser["vendor"] == "mozilla")
                document.getElementById("webpgPlugin").style.display = "none";
            gpgauth.utils.openNewTab(gpgauth.utils.resourcePath + "error.html");
        }

    },


    // Called when a message is passed.
    onRequest: function(request, sender, sendResponse) {
        // set the default response to null
        var response = null;
        var user_authenticated = false;
        // Show the page action for the tab that the sender (content script) was on.
        if (request.msg == 'show') {
            var headers = request.params['headers'];
            //headers = gpgauth.background.gpg_elements[request.params['domain']]['headers'];
            user_authenticated = headers['X-GPGAuth-Authenticated'] == 'true' ? true : false;
            if (gpgauth.background.gpg_elements[request.params['domain']]) {
                if (gpgauth.background.gpg_elements[request.params['domain']]['server_validated'] == true) {
                    var icon = user_authenticated ? 'images/badges/verified_auth.png' : 'images/badges/server_verified.png';
                } else {
                    var icon = user_authenticated ? 'images/badges/authenticated.png' : 'images/badges/default.png';
                }
                chrome.pageAction.setIcon({
                    tabId: sender.tab.id,
                    path: icon
                });
            }
            chrome.pageAction.show(sender.tab.id);
            //chrome.pageAction.setPopup({tabId: sender.tab.id, popup: "dialogs/popup.html"});
        }
        if (request.msg == 'doServerTests') {
            if (!gpgauth.background.gpg_elements[request.params['domain']]) {
                gpgauth.background.gpg_elements[request.params['domain']] = {};
            }
            var domain_keylist = gpgauth.plugin.getDomainKey(request.params['domain']);
            var domain_key = null;
            // Iterate through the returned domain_keylist to ensure it is not an empty object
            for (var key in domain_keylist) { domain_key = key; break; }
            if (!localStorage.enabled_keys) {
                response = {'valid': false, 'errorno': 2, 'error': 'You have not enabled any personal keys for use with gpgAuth'};
                var dialog = 'dialogs/popup_error.html';
            } else if (!localStorage.default_key) {
                response = {'valid': false, 'errorno': 3, 'error': 'You have not specified a default personal key to use.'};
                var dialog = 'dialogs/popup_error.html';
            } else {
                gpgauth.background.gpg_elements[request.params['domain']]['headers'] = request.params['headers'];
                response = gpgauth.background.doServerTests(request.params['domain'], domain_keylist, request.params['server_verify_url'], request.params['port']);
                user_authenticated = request.params['headers']['X-GPGAuth-Authenticated'] == 'true' ? true : false;
                var dialog = user_authenticated && domain_key ? 'dialogs/success.html' : 'dialogs/enabled.html';
                if (!domain_key) {
                    response['valid'] = false;
                    response['errorno'] = 1;
                    response['error'] = 'Server key not found';
                    dialog = 'dialogs/popup_error.html';
                    // Set to success.html if the user used the login override and authenticated
                    //  despite the missing server key.
                    if (user_authenticated) {
                        dialog = 'dialogs/success.html';
                    }
                }
                chrome.pageAction.setPopup({tabId: sender.tab.id, popup: dialog});
                if (response['server_validated'] == true) {
                    icon = user_authenticated ? 'images/badges/verified_auth.png' : 'images/badges/server_verified.png';
                    if (gpgauth.background.pulses[sender.tab.id] != null) {
                        clearInterval(gpgauth.background.pulses[sender.tab.id]['timer']);
                    }
                    response = {'server_validated': true, 'validation': response};
                } else {
                    icon = user_authenticated ? 'images/badges/authenticated.png' : 'images/badges/default.png';
                    response = {'server_validated': false, 'validation': response};
                }
            }
            if (response['error']) {
                gpgauth.background.gpg_elements[request.params['domain']]['error'] = response['error'];
                gpgauth.background.gpg_elements[request.params['domain']]['errorno'] = response['errorno'];
                response.validation = {'headers' :gpgauth.background.gpg_elements[request.params['domain']]['headers'], domain: request.params['domain'] };
                var icon = user_authenticated ? 'images/badges/authenticated.png' : 'images/badges/default.png';
                chrome.pageAction.setPopup({tabId: sender.tab.id, popup: dialog});
            }
            chrome.pageAction.setIcon({
                tabId: sender.tab.id,
                path: icon
            });
        }
        if (request.msg == 'doUserLogin') {
            if (sender.tab.selected){
                gpgauth.background.gpg_elements[request.params['domain']]['domain'] = request.params['domain'];
                gpgauth.background.gpg_elements[request.params['domain']]['port'] = request.params['port'];
                token_from_server = gpgauth.background.getUserToken(request.params['domain'], request.params['service_login_url'], request.params['port']);
                if (token_from_server['valid']){
                    response = {
                        'valid': true,
                        'decrypted_token': token_from_server['plaintext']['data'],
                        'keyid': token_from_server['keyid'],
                        'validation' : gpgauth.background.gpg_elements[request.params['domain']]
                    }
                } else {
                    console.log(token_from_server);
                    dvalues = gpgauth.background.gpg_elements[request.params['domain']]
                    icon = dvalues['server_validated'] ? 'server_verified.png' : 'default.png';
                    gpgauth.background.gpg_elements[request.params['domain']]['error'] = "Unable to decrypt token";
                    gpgauth.background.gpg_elements[request.params['domain']]['errorno'] = token_from_server['errorno'];
                    gpgauth.background.gpg_elements[request.params['domain']]['cipher'] = token_from_server['cipher'];
                    chrome.pageAction.setPopup({tabId: sender.tab.id, popup: "dialogs/popup_error.html"});
                    gpgauth.background.pulses[sender.tab.id] = {
                        'timer': null,
                        'icons': ['error.png', icon],
                        'current_icon': 1,
                        'counter': 10
                    }
//                    gpgauth.background.pulses[sender.tab.id]['timer'] = setInterval(gpgauth.background.pulse(sender.tab.id), 500);
                    response = {'valid': false };
                }
            } else {
                response = {'valid': false };
            }
        }
        if (request.msg == 'enabled') {
            response = {'enabled': gpgauth.preferences.gpgauth_enabled.get() };
        }
        if (request.msg == 'getPopupError') {
            parsed_url = gpgauth.background.parseUrl(request.tab.url);
            domain = parsed_url['domain'];
            response = {};
            response.error = gpgauth.background.gpg_elements[domain]['error'];
            response.errorno = gpgauth.background.gpg_elements[domain]['errorno'];
            response.headers = gpgauth.background.gpg_elements[domain]['headers'];
        }
        if (request.msg == 'getPopupData') {
            parsed_url = gpgauth.background.parseUrl(request.tab.url);
            domain = parsed_url['domain'];
            response = {};
            response['popup_data'] = { 'Domain': domain, 
                'Public Key' : gpgauth.background.gpg_elements[domain]['domain_key'],
                'Trust Level': gpgauth.background.gpg_elements[domain]['domain_key_trust']
            };
            response.error = gpgauth.background.gpg_elements[domain]['error'];
            response.errorno = gpgauth.background.gpg_elements[domain]['errorno'];
            response['validation'] = {
                'domain': domain,
                'server_validated': gpgauth.background.gpg_elements[domain]['server_validated'],
                'configured_trust': gpgauth.background.gpg_elements[domain]['trust_level'],
                'domain_key_trust': gpgauth.background.gpg_elements[domain]['domain_key_trust'],
                'headers': gpgauth.background.gpg_elements[domain]['headers'],
                'trust_reason' : domain_trust_detail[gpgauth.background.gpg_elements[domain]['domain_key_trust']],
                'tab': request.tab,
            }
        }
        if (request.msg == 'async-gpgGenKey') {
            console.log("async-gpgGenKey requested");
            var result = gpgauth.plugin.gpgGenKey(
                    request.data['publicKey_algo'],
                    request.data['publicKey_size'],
                    request.data['subKey_algo'],
                    request.data['subKey_size'],
                    request.data['uid_0_name'],
                    '',
                    request.data['uid_0_email'],
                    request.data['key_expire'],
                    request.data['passphrase']
                );
            response = "queued";
        }
        if (request.msg == 'complete' || request.msg == 'stage2') {
            if (gpgauth.background.pulses[sender.tab.id] != null) {
                clearInterval(gpgauth.background.pulses[sender.tab.id]['timer']);
            }
            chrome.pageAction.setIcon({
                tabId: sender.tab.id,
                path: 'images/badges/authenticated.png'
            });
            chrome.pageAction.setPopup({tabId: sender.tab.id, popup: "dialogs/success.html"});
        }
        if (request.msg == 'error') {
            console.log(request.params.headers, request.params.result);
            dvalues = gpgauth.background.gpg_elements[request.params['domain']]
            icon = dvalues['server_validated'] ? 'server_verified.png' : 'default.png';
            gpgauth.background.gpg_elements[request.params['domain']]['error'] = request.params.headers['X-GPGAuth-Error'];
            gpgauth.background.gpg_elements[request.params['domain']]['errorno'] = 7;
            chrome.pageAction.setPopup({tabId: sender.tab.id, popup: "dialogs/popup_error.html"});
            gpgauth.background.pulses[sender.tab.id] = {
                'timer': null,
                'icons': ['error.png', icon],
                'current_icon': 1,
                'counter': 10
            }
//            gpgauth.background.pulses[sender.tab.id]['timer'] = setInterval(gpgauth.background.pulse(sender.tab.id), 500);
            response = {'valid': false, 'errorno': 2, 'error': 'You have not enabled any personal keys for use with gpgAuth' };
        }
        if (request.msg == 'doKeyImport') {
            headers = gpgauth.background.gpg_elements[request.domain]['headers'];
            pubkey_url = headers['X-GPGAuth-Pubkey-URL'];
            console.log(request);
            if (pubkey_url) {
                msg = null;
                var http = new XMLHttpRequest();
                http.open("GET", pubkey_url + "#" + new Date().getTime(), false);
                http.setRequestHeader('X-User-Agent', 'gpgauth ' + CLIENT_VERSION + '/chrome');
                http.send(null);

                if(http.readyState == 4 && http.status == 200) {
                    validity = true;
                    msg = http.responseText;
                    msg = gpgauth.plugin.gpgImportKey(msg);
                    //console.log(http.responseText);
                } else {
                    validity = false;
                    msg = "Pubkey not found";
                }
            } else {
                // pubkey url not found
                validity = false;
                msg = "No Pubkey URL Specified";
            }
            if (!validity)
                msg = { 'error': msg }
            else
                msg['error'] = false;
            response = { 'valid': validity, 'msg': msg };
        }
        // Return the response and let the connection be cleaned up.
        sendResponse({'result': response});
    },

    parseUrl: function(url) {
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
    },


    /*
    Function: getUserToken
    Make a request to the server to retrieve the token for the user via a
     POST to the user_auth_url with the users keyid (this is only called if
     the server has been verified, or the verification has been overridden
     by the user)
    */
    getUserToken: function(domain, login_url, port) {
        var response_headers = null;
        var server_response = null;
        var http = new XMLHttpRequest();
        var keyid = gpgauth.preferences.default_key.get();
        var params = "gpg_auth:keyid=" + encodeURIComponent(keyid);
        http.open("POST", login_url, false);
        http.setRequestHeader('X-User-Agent', 'gpgauth ' + CLIENT_VERSION + '/chrome');
        http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        http.send(params);

        if(http.readyState == 4 && http.status == 200) {
            server_response = http.getResponseHeader('X-GPGAuth-User-Auth-Token')
            //console.log(http.getAllResponseHeaders());
        } else {
            server_response = "Status: " + http.status + "<br>Resposne:<br>" + http.responseText;
        }

        // Here we check to see if the server has reported any issues with key
        if (server_response == "get_key failed") {
            return {'valid': false, 'errorno': 4, 'error': 
                'The server was unable to find your Public Key (' + keyid + ').'
            };
        }

        if (server_response == "encrypt failed") {
            return {'valid': false, 'errorno': 4, 'error': 
                'The server was unable to encrypt to your Public Key (' + keyid + ').'
            };
        }

        if (this.debug){
            console.log(http.responseText);
            console.log(unescape(server_response));
        }

        cipher = unescape(server_response).replace(/\\\+/g, ' ').replace(/\\./g, '.');
        plaintext = gpgauth.plugin.gpgDecrypt(cipher)
        if (this.debug) console.log('plaintext: ', plaintext);

        var random_re = new RegExp("^gpgauth(([v][0-9][.][0-9]{1,2})([.][0-9]{1,3}))[\|]([0-9]+)[\|]([a-z0-9]+)[\|]gpgauth(([v][0-9][.][0-9]{1,2})([.][0-9]{1,3}))$", "i");
        // if the response from the server matches both the format and content of the original token, server is validated
        if (plaintext && random_re.test(plaintext['data'])) {
            if (this.debug) console.log("token matches gpgAuth format, it is safe to return to the server decrypted");
            return {'valid': true, 'plaintext': plaintext, 'keyid': keyid};
        } else {
            if (plaintext['error'] && plaintext['gpg_error_code'] == 11){
                console.log("the passphrase was incorrect or cancelled");
                errorno = 5;
            } else {
                console.log("the token does not match the gpgAuth format, or is null");
                errorno = 6;
            }
            return {'valid': false, 'errorno': errorno, 'cipher': cipher};
        }
    },

    /*
    Function: verifyDomainKey
    This function accepts a keylist object and iterates through the returned
     keys to verify the validity of the UID(s) matching the domain have been
     signed by one or more of the defined private keys
    */
    verifyDomainKey: function(domain, domain_keylist){
        // first get a list of selected private keys for the user -
        var private_keylist = gpgauth.preferences.enabled_keys.get();
        if(!private_keylist) {
            private_keylist = {};
        }

        var keylist = gpgauth.plugin.getPublicKeyList();
        if (!keylist) {
            keylist = {};
        }

        /* for each domain_key returned by getDomainKey, and each user selected
            private key, validate via the NPAPI plugin and return the first
            acceptable match. A match being:
                key.uid == document.domain && key.uid tsigned by private_keyid
                NOTE: the key.uid must match sub.host.tld
        */
        for (var key in domain_keylist) { var domain_key = key; break; }
        var usable_domain_keyid = null;
        var usable_private_keyid = null;
        var usable_domain_key_trust = null;
        var trust = -1;
        if (domain_keylist) {
            for (var uid_i in domain_keylist[domain_key].uids) {
                if (domain_keylist[key].uids[uid_i].uid == domain) {
                    var uid = uid_i;
                    break;
                }
            }
            for (var privateKeyId in private_keylist) {
                if (!private_keylist[privateKeyId].keystatus){
                    var GAUTrust = gpgauth.plugin.verifyDomainKey(keylist[domain_key].uids[uid].uid, domain_key, uid, private_keylist[privateKeyId]);
                    usable_domain_keyid = domain_key;
                    usable_private_keyid = privateKeyId;
                    usable_domain_key_trust = GAUTrust;
                    if (GAUTrust == '?' || GAUTrust == 0) {
                        break;
                    }
                }
            }
        }

        return {'domain_key': usable_domain_keyid, 'user_key': usable_private_keyid, 'domain_key_trust': usable_domain_key_trust};
    },

    doServerTests: function(domain, domain_keylist, server_verify_url, port) {
        if (!this.gpg_elements[domain]) {
            this.gpg_elements[domain] = {};
        }
        // The trust configuration has changed for this domain, don't use cached server validation
        if (this.gpg_elements[domain]['trust_level'] != parseInt(gpgauth.preferences.trust_level.get())) {
            this.gpg_elements[domain]['server_validated'] = false;
        }
        this.gpg_elements[domain]['cached'] = false;
        key_results_length = 0;
        for (key in domain_keylist) {
            key_results_length = 1; break;
        }
        key_results = key_results_length > 0 ? gpgauth.background.verifyDomainKey(domain, domain_keylist) : {};
        // If the domain_key_trust has changed, don't use cached server validation
        if (parseInt(key_results['domain_key_trust']) < 0 || key_results['domain_key_trust'] == null
            || key_results['domain_key_trust'] > parseInt(gpgauth.preferences.trust_level.get())
            || this.gpg_elements[domain]['trust_level'] != parseInt(gpgauth.preferences.trust_level.get())) {
            this.gpg_elements[domain]['server_validated'] = false;
            if (this.debug) console.log("Not using cached...");
        }
        this.gpg_elements[domain]['cached'] = false;

        if (!this.gpg_elements[domain]['server_validated'] == true) {
            this.gpg_elements[domain]['server_verify_url'] = server_verify_url;
            //key_results = key_results_length > 0 ? gpgauth.background.verifyDomainKey(domain, domain_keylist) : {};
            //verify the result here, consult preferences for minimum trust level
            this.gpg_elements[domain]['domain_key'] = key_results['domain_key'];
            this.gpg_elements[domain]['domain_key_trust'] = key_results['domain_key_trust'];
            //this.gpg_elements[domain]['user_key'] = key_results['user_key'];
            this.gpg_elements[domain]['trust_level'] = parseInt(gpgauth.preferences.trust_level.get())
            if (parseInt(key_results['domain_key_trust']) < 0 || key_results['domain_key_trust'] == null
                || key_results['domain_key_trust'] > parseInt(gpgauth.preferences.trust_level.get())) {
                this.gpg_elements[domain]['server_validated'] = false;
            } else {
                if (this.debug) console.log("keyresult was " + key_results['domain_key_trust'] );
                var token = this.generate_random_token();
                this.gpg_elements[domain]['token_for_server'] = token;
                var enc_result = gpgauth.plugin.gpgEncrypt(token, [key_results['domain_key']], 0);
                if (enc_result['error']) {
                    encrypted_token = {'valid': false, 'errorno': enc_result['gpgme_err_code'], 'error': enc_result['error_string']};
                } else {
                    encrypted_token = enc_result['data'];
                }
                if (this.debug) console.log(encrypted_token);
                this.gpg_elements[domain]['server_validated'] = false;
                var server_response = gpgauth.background.doServerTokenTests(domain, encrypted_token);
            }
        } else {
            this.gpg_elements[domain]['cached'] = true;
        }
        return this.gpg_elements[domain];
    },


    doServerTokenTests: function(domain, encrypted_token) {
        // reset server_validated to false in-case of an exception
        this.gpg_elements[domain]['server_validated'] = false;
        var http = new XMLHttpRequest();
        var params = "gpg_auth:server_verify_token=" + encodeURIComponent(encrypted_token);
        http.open("POST", this.gpg_elements[domain]['server_verify_url'], false);
        http.setRequestHeader('X-User-Agent', 'gpgauth ' + CLIENT_VERSION + '/chrome');
        //Send the proper header information along with the request
        http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        http.send(params);

        if(http.readyState == 4 && http.status == 200) {
            server_response = http.getResponseHeader('X-GPGAuth-Verify-Response')
        } else {
            server_response = "Status: " + http.status + "<br>Resposne:<br>" + http.responseText;
        }
        if (this.debug){
            console.log(http.responseText);
            console.log(server_response);
        }
        var random_re = new RegExp( "^[a-z0-9]+$", "i" );
        // if the response from the server matches both the format and content of the original token, server is validated
        if (random_re.test(server_response) && server_response == this.gpg_elements[domain]['token_for_server'] ) {
            this.gpg_elements[domain]['server_validated'] = true;
        }
        return server_response;
    },

    gpgGenKeyProgress: function(data) {
        var port = chrome.extension.connect({name: "gpgGenKeyProgress"});
        port.postMessage({"type": "progress", "data": data});
        port.disconnect()
    },

    gpgGenKeyComplete: function(data) {
        var port = chrome.extension.connect({name: "gpgGenKeyProgress"});
        port.postMessage({"type": "progress", "data": data});
        port.disconnect();
        var notification = webkitNotifications.createNotification(
          'images/gpgauth-48.png',
          'Key Generation Complete',
          'The generation of your new Key is now complete.'
        );
        notification.show();
    },

    pulse: function(tab_id) {
        if (this.pulses[tab_id]['counter']) {
            this.pulses[tab_id]['counter'] -= 1;
            this.pulses[tab_id]['current_icon'] = (this.pulses[tab_id]['current_icon'] == 0) ? 1 : 0;
            chrome.pageAction.setIcon({
                tabId: tab_id,
                path: 'images/badges/' + this.pulses[tab_id]['icons'][this.pulses[tab_id]['current_icon']]
            });
        } else {
            clearInterval(this.pulses[tab_id]['timer']);
            chrome.pageAction.setIcon({
                tabId: tab_id,
                path: 'images/badges/' + this.pulses[tab_id]['icons'][1]
            });
        }
    },

    generate_random_token: function() {
        var minsize, maxsize, count, actualsize, random_value;
        minsize = parseInt(60);
        maxsize = parseInt(100);
        startvalid = "";
        validchars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        actualsize = Math.floor( Math.random() * ( maxsize - minsize + 1 ) ) + minsize;
        random_value = startvalid.charAt( Math.floor( Math.random() * startvalid.length ) );
        for (count = 1; count < actualsize; count++){
            random_value += validchars.charAt( Math.floor( Math.random() * validchars.length ) );
        }
        return random_value;
    },
}

gpgauth.background.gpg_elements = {};
gpgauth.background.debug = false;
gpgauth.background.pulses = {};

// Listen for the content script to send a message to the background page.
chrome.extension.onRequest.addListener(gpgauth.background.onRequest);

gpgauth.background.init();
/* ]]> */
