/* <![CDATA[ */
if (typeof(jQuery)!='undefined') { var jq = jQuery.noConflict(true); }

var ext = chrome.extension.getBackgroundPage();
jq(function(){
    jq('#enable-gpgauth-check')[0].checked = 
        (window.ext.gpgauth_prefs.gpgauth_enabled.get() == 'true');

    jq('#setup_link')[0].href = chrome.extension.getURL('druid.html');

    jq('#tab-2-btn').click(function(){
        if (!window.private_built) {
            jq("#dialog-modal").dialog({
                height: 140,
                modal: true,
                autoOpen: true,
                title: "Building Keylist"
            }).children()[0].innerHTML = "Please wait while build the keylist.";
            setTimeout( function(){ buildKeylist(keylist=null, 'private'); jq("#dialog-modal").dialog('destroy');}, 10);
        }
        window.private_built = true;
    });

    jq('#tab-3-btn').click(function(){
        if (!window.public_built) {
            jq("#dialog-modal").dialog({
                height: 140,
                modal: true,
                autoOpen: true,
                title: "Building Keylist"
            }).children()[0].innerHTML = "Please wait while build the keylist.";
            setTimeout( function(){ buildKeylist(keylist=null, 'public'); jq("#dialog-modal").dialog('destroy');}, 10);
        }
        window.public_built = true;
    });

    // Begin public keylist generation
    function buildKeylist(keyList, type, openKey, openUID){
        console.log(keyList, type, openKey, openUID);
        if (type == 'public') {
            keylist_element = document.getElementById('public_keylist');
        } else {
            keylist_element = document.getElementById('private_keylist');
            enabled_keys = window.ext.gpgauth_prefs.enabled_keys.get();
        }

        if (!keyList) {
            var keylist = window.ext.plugin.getPublicKeyList();
            if (!keylist) {
                // if the parsing failed, create an empty keylist
                keylist = {};
            }
            var pkeylist = window.ext.plugin.getPrivateKeyList();

            if (!pkeylist) {
                // if the parsing failed, create an empty keylist
                pkeylist = {};
            }
            window.pkeylist = pkeylist;
        }

        keylist_element.innerHTML = "<div class='ui-accordion-left'></div>";

        if (type == 'private') {
            // Create the key-generate button and dialog
            genkey_div = document.createElement('div');
            genkey_div.style.padding = "8px 0 20px 0";
            genkey_button = document.createElement('input');
            genkey_button.setAttribute('value', 'Generate New Key');
            genkey_button.setAttribute('type', 'button');
            jq(genkey_button).button().click(function(e){
                window.genkey_refresh = false;
                jq("#genkey-dialog").dialog({
                    "buttons": { 
                        "Create": function() {
                            form = jq(this).find("#genkey-form")[0];
                            jq(form).parent().before("<div id=\"genkey-status\"> </div>");
                            error = "";
                            if (!form.uid_0_name.value){
                                error += "Name Required<br>";
                                jq(form.uid_0_name).addClass("input-error");
                            }
<!--                            if (!form.uid_0_email.value){-->
<!--                                error += "Email Required<br>";-->
<!--                                jq(form.uid_0_email).addClass("input-error");-->
<!--                            }-->
                            if (form.passphrase.value != form.pass_repeat.value){
                                jq(form.passphrase).addClass("input-error");
                                jq(form.pass_repeat).addClass("input-error");
                                jq(form.passphrase).next()
                                    .find("#passwordStrength-text")
                                    .html("Passphrases do not match")
                                    .css({"color": "#f00"});
                                error += "Passphrases do not match<br>";
                            }
                            if (error.length) {
                                jq("#genkey-status").html(error)[0].style.display="block";
                                return false;
                            }
                            window.genkey_waiting = true;
                            chrome.extension.onConnect.addListener(function(port) {
                                port.onMessage.addListener(function(msg) {
                                    if (msg.type == "progress") {
                                        data = msg.data;
                                        if (!isNaN(data))
                                            data = String.fromCharCode(data);
                                        data += " ";
                                        if(jq("#genkey_progress"))
                                            jq("#genkey_progress")[0].innerHTML += data;
                                        if(data == "complete" || data == "complete ") {
                                            window.genkey_refresh = true;
                                            window.genkey_waiting = false;
                                            new_pkeylist = window.ext.plugin.getPrivateKeyList();
                                            generated_key = null;
                                            for (key in new_pkeylist) {
                                                if (key in window.pkeylist == false) {
                                                    generated_key = key;
                                                    break;
                                                }
                                            }
                                            buildKeylist(null, "private", generated_key, null);
                                            jq("#genkey-status_detail").remove()
                                            jq("#genkey-status").remove();
                                            jq("#genkey-form")[0].reset();
                                            jq("#genkey-form")[0].style.display="inline-block";
                                            jq("#genkey-dialog").dialog("close");
                                        }
                                    }
                                });
                            });
                            jq("#genkey-form").find(".open").trigger("click");
                            console.log("going to create a key with the following details:" + '\n' +
                                "Primary Key:", form.publicKey_algo.value + 
                                  ' (' + form.publicKey_size.value + ')\n' +
                                "Sub Key:", form.subKey_algo.value + 
                                  ' (' + form.subKey_size.value + ')\n' +
                                "name:", form.uid_0_name.value + '\n' +
                                "comment: [Comments not supported yet; this will be blank]\n" +
                                "email:", form.uid_0_email.value + '\n' +
                                "passphrase:", form.passphrase.value +  '\n' +
                                "expiration:", "Key will expire in " + form.key_expire.value + ' days');
                            jq("#genkey-dialog").dialog("option", "minHeight", 250);
                            jq("#genkey-status").html(error)[0].style.display="block";
                            jq("#genkey-status").html("Building key, please wait..");
                            jq("#genkey-status").after("<div id='genkey-status_detail' style=\"font-size: 12px; color:#fff;padding: 20px;\">This may take a long time (5 minutes or more) to complete depending on the selected options. Please be patient while the key is created. It is safe to close this window, key generation will continue in the background.<br><br><div id='genkey_progress' style='height:auto;display:block;'></div></div>");
                            jq(form)[0].style.display = 'none';
                            jq("#genkey-dialog")[0].style.height = "20";
                            jq("#genkey-dialog")[0].style.display = "none";
                            chrome.extension.sendRequest({msg: 'async-gpgGenKey',
                                    data: {'publicKey_algo' : form.publicKey_algo.value,
                                    'publicKey_size' : form.publicKey_size.value,
                                    'subKey_algo' : form.subKey_algo.value,
                                    'subKey_size' : form.subKey_size.value, 
                                    'uid_0_name' : form.uid_0_name.value,
                                    'uid_0_email' : form.uid_0_email.value, 
                                    'key_expire' : form.key_expire.value,
                                    'passphrase' : form.passphrase.value }
                                }, function(response) { 
                                    if (response.result == "queued") {
                                        jq("#genkey-dialog").dialog("option", "buttons", { 
                                            "Close": function() {
                                                jq("#genkey-dialog").dialog("close");
                                            }
                                        });
                                    }
                                });
                        },
                        Cancel: function() {
                            jq("#genkey-dialog").dialog("close");
                            if (window.genkey_refresh)
                                buildKeylist(null, 'private');
                        }
                    },
                });

                jq("#genkey-form").children('input').removeClass('input-error');
                jq("#genkey-form")[0].reset();
                jq('.key-algo').each(function(){
                    jq(this)[0].options.selectedIndex = jq(this)[0].options.length - 1;
                    }).change(function(){
                        if (jq(this)[0].options.selectedIndex == 0){
                            jq(this).parent().next().find('.key-size')[0].options.selectedIndex = 0;
                            jq(this).parent().next().find('.key-size')[0].children(1).disabled = true;
                            jq(this).parent().next().find('.key-size')[0].children(2).disabled = true;
                        } else {
                            jq(this).parent().next().find('.key-size')[0].children(1).disabled = false;
                            jq(this).parent().next().find('.key-size')[0].children(2).disabled = false;
                            jq(this).parent().next().find('.key-size')[0].options.selectedIndex = 1;
                        }
                    });
                jq("#genkey-dialog").dialog('open');
                jq("#genkey-form").find(".open").trigger("click");
            });
            jq("#genkey-dialog").dialog({
                resizable: false,
                minHeight: 250,
                width: 630,
                modal: true,
                autoOpen: false
            });
            jq('.passphrase').passwordStrength("#pass_repeat");
            genkey_div.appendChild(genkey_button);
            document.getElementById('private_keylist').appendChild(genkey_div);
            // End key generation dialog
        }

        var prev_key = null;
        current_keylist = (type == 'public')? keylist : pkeylist;
        for (key in current_keylist){
            if (type == 'public') {
                if (key in pkeylist) {
                    continue;
                }
            } else {
                keyobj = document.createElement('div');
                if (keylist[key].disabled)
                    keyobj.className = 'disabled';
                if (keylist[key].expired)
                    keyobj.className = 'invalid-key';
                if (keylist[key].invalid)
                    keyobj.className = 'invalid-key';
                if (keylist[key].revoked)
                    jq(keyobj).addClass('invalid-key');
                keyobj.className += ' primary_key';
                enabled = (enabled_keys.indexOf(key) != -1) ? 'checked' : '';
                status_text = (enabled) ? "Enabled" : "Disabled";
                default_key = (key == window.ext.gpgauth_prefs.default_key.get()) ? 'checked' : '';
            }
            status = "Valid";
            keyobj = document.createElement('div');
            if (keylist[key].disabled) {
                jq(keyobj).addClass('disabled');
                status = "Disabled";
            }
            if (keylist[key].expired) {
                jq(keyobj).addClass('invalid-key');
                status = "Expired";
            }
            if (keylist[key].invalid) {
                jq(keyobj).addClass('invalid-key');
                status = "Invalid";
            }
            if (keylist[key].revoked) {
                jq(keyobj).addClass('invalid-key');
                status = "Revoked";
            }
            jq(keyobj).addClass('primary_key');
            if (key == openKey) {
                jq(keyobj).addClass('open_key');
                keyobj.setAttribute('id', 'open_key');
            }
            if (type == "public") {
                keyobj.innerHTML = "<h3 class='public_keylist'><a href='#'><span style='margin: 0;width: 50%'>" + keylist[key].name + "</span><span class='trust'></span></a></h3>";
            } else {
                keyobj.innerHTML = "<h3 class='private_keylist' style='height: 24px;'><a href='#'><span style='margin: 0;width: 50%;'>" + keylist[key].name + 
                    "&nbsp;&nbsp;-&nbsp;&nbsp;[0x" + key.substr(-8) + "]</span></a><span class='trust' style='z-index:1000; left: 12px; top:-25px;height:22px;'>" +
                    "<input class='enable-check' id='check-" + key +"' type='checkbox' " + enabled + " onclick=\"if ('" + key + "' == window.ext.gpgauth_prefs.default_key.get()){" +
                    " jq(this).next().addClass('ui-state-active'); return false }; if (this.checked && !window.ext.gpgauth_prefs.default_key.get()) { jq(this).next().next().click(); jq(this).next().next().next().addClass('ui-state-active'); } (this.checked) ? window.ext.gpgauth_prefs.enabled_keys.add('" + key + "') : " +
                    "window.ext.gpgauth_prefs.enabled_keys.remove('" + key + "'); (this.checked) ? jq(this).button('option', 'label', 'Enabled') : jq(this).button('option', " +
                    "'label', 'Disabled');\"/\><label for='check-" + key + "' style='z-index:100;'>" + status_text + "</label><input class='default-check' type='radio' name='default_key' " +
                    " id='default-" + key + "' " + default_key + "/\><label class='default-check' style='z-index: 0; margin-left: 0px;' for='default-" + key + "'>Set as default</label></span></h3>";
            }
            keylist_element.appendChild(keyobj);
            keylist[key].nuids = 0;
            for (uid in keylist[key].uids) {
                keylist[key].nuids += 1;
            }
            uidlist = document.createElement('div');
            uidlist.setAttribute('class', 'uidlist');
            uidlist.setAttribute('id', key);
            created_date = new Date(keylist[key].subkeys[0].created * 1000).toJSON().substring(0, 10);
            expiry = (keylist[key].subkeys[0].expires == 0) ? 'Never' : new Date(keylist[key].subkeys[0].expires * 1000).toJSON();
            if (keylist[key].subkeys[0].expires > 0) {
                expiry = (Math.round(new Date().getTime()/1000.0) > keylist[key].subkeys[0].expires) ? "Expired" : expiry.substring(0, 10);
            }
            keystatus = (keylist[key].disabled)? 'enable':'disable';
            keystatus_text = (keylist[key].disabled)? 'Enable this Key':'Disable this Key';
            key_option_button = "<div class='uid-options' style='font-size:12px;'><input class='" + type + "-key-option-button' id='" + keystatus + "-" + type + "-" + key + "' type='button' value='" + keystatus_text + "'/\></div>";
            uidlist.innerHTML = "<div class='keydetails'><span class='dh'>Key Details</span><hr/\>" +
                "<span><h4>KeyID:</h4> 0x" + key.substr(-8) + "</span><span><h4>Key Created:</h4> " + created_date + "</span><span><h4>Expires:</h4> " + expiry + "</span><span><h4>UIDs:</h4> " + keylist[key].nuids + "</span><br/\>" +
                "<h4>Fingerpint:</h4> " + keylist[key].fingerprint + "<br/\>" +
                "<h4>Status:</h4> " + status +
                "<br/\><br/\>" +
                "<span class='dh'>Key Options</span><hr/\>" +
                key_option_button + "</div>";
            for (uid in keylist[key].uids) {
                uidobj = document.createElement('div');
                uidobj.setAttribute('class', 'uid');
                uidobj.setAttribute('id', key + '-' + uid);
                if (key == openKey && uid == openUID)
                    jq(uidobj).addClass('open_uid');
                if (keylist[key].expired || keylist[key].uids[uid].revoked)
                    uidobj.className += ' invalid-key';
                email = (keylist[key].uids[uid].email.length > 1) ? "  -  &lt;" + keylist[key].uids[uid].email + "&gt;" :
                    "  - (no email address provided)";
                uidobj.innerHTML += "<h4 class='uidlist'><a href='#'><span style='margin:0; width: 50%'>" + keylist[key].uids[uid].uid + email + "</span><span class='trust' style='text-decoration: none;'></span></a></h4>";
                signed = 0;
                nd_trust = false;
                uidobjbody = document.createElement('div');
                uidobjbody.innerHTML = "<div class='uid-options'><input class='uid-option-button' id='sign-" + type + "-" + key + "-" + uid + "' type='button' value='Sign this UID'/\></div><br/\>";
                if (keylist[key].uids[uid].revoked)
                    jq(uidobjbody).find('.uid-option-button').addClass('uid-revoked');
                if (keylist[key].expired)
                    jq(uidobjbody).find('.uid-option-button').addClass('key-expired');
                for (sig in keylist[key].uids[uid].signatures) {
                    sig_keyid = keylist[key].uids[uid].signatures[sig]
                    if (sig_keyid in keylist || nd_trust) {
                        if (sig_keyid in pkeylist) {
                            signed = 1;
                        }
                        email = (keylist[sig_keyid].uids[0].email.length > 1) ? "&lt;" + keylist[sig_keyid].uids[0].email + "&gt;" : "(no email address provided)"
                        uidobjbody.innerHTML += "<div id='sig-" + sig_keyid + "-" + sig + "' class='signature-box'>" +
                            "<img src='images/badges/stock_signature.png'><span class='signature-uid'>" + 
                            keylist[sig_keyid].name + "</span><br/\><span class='signature-email'>" + 
                            email + "</span><br/\><span class='signature-keyid'>" + sig_keyid + "</span><br/\><input type='button' class='delsig-button' id='delsig-" + type + "-" + key + "-" + uid + "-" + sig + "' value='Delete'/\></div>";
                    }
                }
                uidobj.appendChild(uidobjbody);
                uidlist.appendChild(uidobj);
            }
            keyobj.appendChild(uidlist);
        }
        jq('.trust').click(function(e){
            e.stopPropagation();
        });
        jq('#' + type + '_keylist').children('.primary_key').accordion({ header: 'h3', alwaysOpen: false,
                    autoheight:false, clearStyle:true, active: '.ui-accordion-left',
                    collapsible: true }).children();
        jq('#' + type + '_keylist').children('.open_key').accordion("activate" , 0);
        jq(".uidlist").children('.uid').accordion({ header: 'h4.uidlist', alwaysOpen: false,
                    autoheight:false, clearStyle:true, active:'.ui-accordion-left',
                    collapsible: true });

        if (openKey) {
            open_element = jq('#' + type + '_keylist').children('.open_key');
            if (open_element && type=='public') {
                //wait_icon = open_element.find('a').children('.trust')[0].children(0);
                uid_list = open_element.children('h3').find('a')[0];
                jq("#dialog-modal").dialog({
                    height: 140,
                    modal: true,
                    title: "Calculating Trust"
                }).children()[0].innerHTML = "Please wait while recalculate the trust for this item.";
                setTimeout( function() { refresh_trust(uid_list, 'public') }, 300);
            }
        }

        if (jq('.uidlist').find('.open_uid'))
            jq('.uidlist').find('.open_uid').accordion("activate", 0);
        jq('.private-key-option-button').button().click(function(e){
            params = this.id.split('-');
            if (params[0] == "disable")
                window.ext.plugin.gpgDisableKey(params[2]);
            else
                window.ext.plugin.gpgEnableKey(params[2]);
            console.log(".public-key-option-button pressed..", params);
            buildKeylist(null, params[1], params[2], null);
        });
        jq('.public-key-option-button').button().click(function(e){
            params = this.id.split('-');
            if (params[0] == "disable")
                window.ext.plugin.gpgDisableKey(params[2]);
            else
                window.ext.plugin.gpgEnableKey(params[2]);
            console.log(".public-key-option-button pressed..", params);
            buildKeylist(null, params[1], params[2], null);
        });
        jq('.uid-option-button').button().click(function(e){
            jq("#createsig-dialog").dialog({
                resizable: false,
                minHeight: 250,
                width: 630,
                modal: true,
                autoOpen: false
            });
            params = this.id.split('-');
            enabled_keys = window.ext.gpgauth_prefs.enabled_keys.get();
            jq('#createsig-form')[0].innerHTML = "<p class='help-text'>Please select which of your keys to create the signature with:</p>";
            current_signatures = keylist[params[2]].uids[params[3]].signatures;
            cursig = [];
            for (sig in current_signatures) {
                cursig.push(current_signatures[sig]);
            }
            if (!window.ext.gpgauth_prefs.enabled_keys.length()) {
                jq('#createsig-form')[0].innerHTML += "You have not enabled any keys for use with gpgAuth; <a href='" + chrome.extension.getURL('options.html') + "?tab=1&helper=enable'>please click here</a> and select 1 or more keys for use with gpgAuth.";
            }
            for (idx in enabled_keys) {
                key = enabled_keys[idx];
                signed = (cursig.indexOf(key) != -1);
                status = signed? "<div style='width: 28px; display: inline;text-align:right;'><img style='height: 14px; padding: 2px 2px 0 4px;' id='img_" + key + "' " +
                    "src='/images/badges/stock_signature.png' alt='Already signed with this key'/\></div>" :
                    "<div style='width: 28px; display: inline;text-align:right;'><img style='display:none; height: 14px; padding: 2px 2px 0 4px;' id='img_" + key + "' " +
                    "src='/images/check.png' alt='Signature added using this key'/\></div>";
                if (signed)
                    status += "<input style='display: none;' type='checkbox' id='sign_" + key + "' name='" + key + "' disabled/\>";
                else
                    status += "<input type='checkbox' id='sign_" + key + "' name='" + key + "'/\>";
                jq('#createsig-form')[0].innerHTML += status + "<label for='sign_" + key + "' id='lbl-sign_" + key + "' class='help-text'>" + pkeylist[key].name + " (" + key + ")</label><div id='lbl-sign-err_" + key + "' style='display: none;'></div><br/\>";
                if (window.ext.gpgauth_prefs.enabled_keys.length() == 1 && signed) {
                    jq(jq("button", jq("#createsig-dialog").parent()).children()[1]).hide();
                }
            }
            var refresh = false;
            jq("#createsig-dialog").dialog({
                "buttons": {
                    "Cancel": function() {
                        jq("#createsig-dialog").dialog("destroy");
                        if (refresh) {
                            buildKeylist(null, params[1], params[2], params[3]);
                        }
                    },
                    " Sign ": function() {
                        checked = jq("#createsig-form").children("input:checked");
                        error = false;
                        for (item in checked) {
                            if (checked[item].type == "checkbox") {
                                sign_result = window.ext.plugin.gpgSignUID(params[2], 
                                    parseInt(params[3]) + 1,
                                    checked[item].name, 1, 1, 1);
                                error = (error || (sign_result['error'] && sign_result['gpg_error_code'] != 65)); // if this is true, there were errors, leave the dialog open
                                if (sign_result['error'] && sign_result['gpg_error_code'] != 65) {
                                    jq('#img_' + checked[item].name)[0].src = "/images/cancel.png"
                                    lbl_sign_error = jq('#lbl-sign-err_' + checked[item].name)[0];
                                    lbl_sign_error.style.display = "inline";
                                    lbl_sign_error.style.color = "#f40";
                                    lbl_sign_error.style.margin = "0 0 0 20px";
                                    lbl_sign_error.innerHTML = sign_result['error_string'];
                                    jq(jq("button", jq("#createsig-dialog").parent()).children()[0]).text("Close")
                                    jq(jq("button", jq("#createsig-dialog").parent()).children()[1]).text("Try again")
                                } else {
                                    refresh = true; // the keys have changed, we should refresh on dialog close;
                                    jq('#img_' + checked[item].name)[0].src = "/images/check.png"
                                }
                                jq('#img_' + checked[item].name).show().next().hide();
                            }
                        }
                        console.log("should we refresh?", refresh? "yes":"no");
                        if (!error && refresh) {
                            jq("#createsig-dialog").dialog("destroy");
                            buildKeylist(null, params[1], params[2], params[3]);
                        }
                    }
                }
            })
            if (window.ext.gpgauth_prefs.enabled_keys.length() == 1 && cursig.indexOf(enabled_keys[0]) != -1) {
                jq(jq("button", jq("#createsig-dialog").parent()).children()[1]).hide();
            }
            jq("#createsig-dialog").dialog('open');
        });
        if (!window.ext.plugin.webpg_status.gpgconf_detected) {
            jq('.uid-option-button').button({disabled: true, label: "Cannot create signatures without gpgconf utility installed"});
        }
        jq('.uid-revoked').button({disabled: true, label: "Cannot sign a revoked UID"});
        jq('.key-expired').button({disabled: true, label: "Cannot sign an expired key"});
        jq('.delsig-button').button().click(function(e){
            params = this.id.split('-');
            calling_button = this;
            sig_details = jq(calling_button).parent()[0].id.split('-');
            jq("#delsig-confirm").find('#delsig-text')[0].innerHTML = "Are you certain you would like to delete signature " +
                sig_details[1] + " from this User id?";
            if (sig_details[1] in pkeylist < 1) {
                jq("#delsig-confirm").find('#delsig-text')[0].innerHTML += "<br><br><span class='ui-icon ui-icon-alert' style='float:left; margin:0 7px 20px 0;'></span>This signature was made with a key that does not belong to you; This action cannot be undone without refreshing the keylist from a remote source.";
                jq("#delsig-confirm").dialog("option", "height", "200");
            }
            jq("#delsig-confirm").dialog("option", "buttons", { "Delete": function() {
                        delsig_result = window.ext.plugin.gpgDeleteUIDSign(params[2], parseInt(params[3]) + 1, parseInt(params[4]) + 1);
                        console.log('delete', delsig_result, params[2], parseInt(params[3]) + 1, parseInt(params[4]) + 1)
                        //jq(calling_button).parent().parent()[0].removeChild(jq(calling_button).parent()[0]);
                        buildKeylist(null, params[1], params[2], params[3]);
                        jq("#delsig-confirm").dialog("close");
                    },
                    Cancel: function() {
                        jq("#delsig-confirm").dialog("close");
                    }
                }
            );
            jq("#delsig-confirm").dialog('open');
        });
        jq("#delsig-confirm").dialog({
            resizable: false,
            height:180,
            modal: true,
            autoOpen: false,
            buttons: {
                'Delete this Signature?': function() {
                    jq(this).dialog('close');
                },
                Cancel: function() {
                    jq(this).dialog('close');
                }
            }
        });
        jq('.public_keylist').click(function(e){
            e.stopImmediatePropagation()
            e.preventDefault();
            e.stopPropagation();
            if (this.className.search('active') > -1) {
                jq("#dialog-modal").dialog({
                    height: 140,
                    modal: true,
                    title: "Calculating Trust"
                }).children()[0].innerHTML = "Please wait while recalculate the trust for this item.";
                console.log("calling refresh_trust from line 419;");
                setTimeout( function() { refresh_trust(e.target, 'public') }, 300);
            }
        });
        jq('.enable-check').button().next().next().button({
                text: false,
                icons: {
                    primary: 'ui-icon-check'
                }
            })
            .click(function(e) {
                keyid = this.id.substr(-16);
                window.ext.gpgauth_prefs.default_key.set(keyid);
                enable_element = jq('#check-' + this.id.substr(-16))[0];
                enabled_keys = window.ext.gpgauth_prefs.enabled_keys.get();
                if (enabled_keys.indexOf(keyid) == -1) {
                    window.ext.gpgauth_prefs.enabled_keys.add(keyid);
                    jq(enable_element).trigger('click');
                    jq(enable_element).next()[0].innerHTML = jq(enable_element).next()[0].innerHTML.replace('Disabled', 'Enabled');
                }
            }).parent().buttonset();
    }
    /* end publickeylist */

    //buildKeylist(keylist=null, 'public');
    //buildKeylist(keylist=null, 'private');

    jq('#trust-level-sel').ready(function(e){
        trust_level = window.ext.gpgauth_prefs.trust_level.get();
        jq(this).find('#trust-list').children().eq(trust_level).addClass('selected');
        jq(this).find('#trust-level-desc').children().eq(trust_level).addClass('selected');
    });
    jq('#trust-level-sel').mouseenter( function(){
        jq('#trust-level-desc').slideToggle(600);
    }).mouseleave(function(){
        jq('#trust-level-desc').slideToggle(600);
    });

    jq('.level').click(function(e){
        jq(this).parent().find('.selected').removeClass('selected');
        jq(this).addClass('selected');
        jq('#trust-level-desc').children('.selected').removeClass('selected');
        current_index = jq(this).parent().find('span').index(this);
        jq('#trust-level-desc').children().eq(current_index).addClass('selected');
        window.ext.gpgauth_prefs.trust_level.set(current_index);
    });
    jq('.trust-level-desc').click(function(e){
        jq(this).parent().find('.selected').removeClass('selected');
        jq(this).addClass('selected');
        current_index = jq(this).parent().find('div').index(this);
        jq('#trust-list').children('.selected').removeClass('selected');
        jq('#trust-list').children().eq(current_index).addClass('selected');
        window.ext.gpgauth_prefs.trust_level.set(current_index);
    });

    jq('#enable-gpgauth-check').button({
        'label': (window.ext.gpgauth_prefs.gpgauth_enabled.get() == 'true') ? 'Enabled' : 'Disabled'
        }).click(function(e) {
            (window.ext.gpgauth_prefs.gpgauth_enabled.get() == 'true') ? window.ext.gpgauth_prefs.gpgauth_enabled.set(false) : ext.gpgauth_prefs.gpgauth_enabled.set(true);
            status = (window.ext.gpgauth_prefs.gpgauth_enabled.get() == 'true') ? 'Enabled' : 'Disabled'
            jq(this).button('option', 'label', status);
            this.checked = (window.ext.gpgauth_prefs.gpgauth_enabled.get() == 'true');
            jq(this).button('refresh');
        });

    refresh_trust = function(item, type) {
        console.log("refresh requested for type", type);
        if (type == 'private') {
            jq("#dialog-modal:ui-dialog").dialog( "destroy" );
            return false;
        }
        if (item.parentNode.parentNode && item.parentNode.parentNode.nodeName == "H3") {
            uidcontainer = item.parentNode.parentNode.parentNode.children[1];
        } else {
            uidcontainer = item.parentNode.parentNode.children[1];
        }
        uidlist = jq(uidcontainer).children('[class~=uid]');
        var keylist = window.ext.plugin.getPublicKeyList();
        if (!keylist) {
            // if the parsing failed, create an empty keylist
            keylist = {};
        }
        key = uidcontainer.id;
        GAUTrust = -1;
        uidlist.each(function(event, uidobj) {
            uid = uidobj.id.split('-')[1];
            enabled_keys = window.ext.gpgauth_prefs.enabled_keys.get();
            for (privateKeyId in enabled_keys) {
                GAUTrust = window.ext.plugin.verifyDomainKey(keylist[key].uids[uid].uid, key, uid, enabled_keys[privateKeyId]);
                if (GAUTrust == 0) {
                    break;
                }
            }
            validity = (keylist[key].uids[uid].revoked) ? 'revoked' : keylist[key].uids[uid].validity;
            validity += (keylist[key].uids[uid].invalid) ? ' | invalid' : '';
            jq(uidobj).find('.trust')[0].innerHTML = validity + ' | gpgAuth trust: ' + GAUTrust;
        });
        jq("#dialog-modal:ui-dialog").dialog( "destroy" );
    }

    if (window.location.search.substring) {
        var query_string = {};
        window.location.search.replace(
            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
            function($0, $1, $2, $3) { query_string[$1] = $3; }
        );
    }

    selected_tab = query_string.tab ? query_string.tab : 0;
    jq('#tabs').tabs({ selected: selected_tab });
    openKey = (query_string.openkey)? query_string.openkey : null;
    if (selected_tab == 1)
        buildKeylist(null, 'private', openKey);
    if (selected_tab == 2)
        buildKeylist(null, 'public', openKey);
    if (query_string.strip) {
        jq("#header").remove();
        jq(document.getElementsByTagName("ul")[0]).remove();
    }
    jq('#close').button().click(function(e) { window.close(); });
    if (query_string.helper) {
        function bounce(elem_class, left, top, perpetual) {
            nleft = jq(elem_class).parent().offset().left - left;
            ntop = jq(elem_class).parent().offset().top - top;
            jq("#error_help").parent().css('left', nleft).css('top', ntop).
                effect("bounce", {times: 1, direction: 'up', distance: 8 }, 1200, function(){ if (perpetual) { bounce(elem_class, left, top, perpetual) } } )
        }
        helper_arrow = document.createElement('div');
        helper_arrow.innerHTML = '' +
            '<div id="error_help" style="text-align: center; display: inline; text-shadow: #000 1px 1px 1px; color: #fff; font-size: 12px;">' +
            '<div id="help_text" style="display: block; -moz-border-radius: 4px; -webkit-border-radius: 4px; z-index: 10; padding: 8px 5px 8px 5px; margin-right: -5px; background-color: #ff6600; min-width: 130px;"></div>' +
            '<span style="margin-left: 94px;"><img width="30px" src="/images/help_arrow.png"></span>' +
            '</div>';
        helper_arrow.style.position = 'absolute';
        helper_arrow.style.zIndex = 1000;
        jq(helper_arrow).css("max-width", "75%");
        switch(query_string.helper){
            case 'enable':
                jq(helper_arrow).find('#help_text')[0].innerHTML = "Click to enable key";
                document.body.appendChild(helper_arrow);
                jq('.enable-check').click(function() { jq(helper_arrow).stop(true, true).stop(true, true).hide(); });
                bounce('.enable-check', 75, 45, true);
                break;
            case 'default':
                jq(helper_arrow).find('#help_text')[0].innerHTML = "Click to set default key";
                jq('.default-check').click(function() { jq(helper_arrow).stop(true, true).stop(true, true).hide(); });
                document.body.appendChild(helper_arrow);
                bounce('.default-check', 40, 45, true);
                break;
            case 'signuids':
                jq(helper_arrow).find('#help_text')[0].innerHTML = "Below is a list of key IDs that represent the domains that this server key is valid for; please sign the domain IDs that you want to use with gpgAuth.";
                document.body.appendChild(helper_arrow);
                bounce('#disable-public-' + openKey, 15, 15, false);
                break;
        }
    }

    jq('ul.expand').each(function(){
        jq('li.trigger', this).filter(':first').addClass('top').end().filter(':not(.open)').next().hide();
        jq('li.trigger', this).click(function(){
            height = (jq("#genkey-status")) ? jq("#genkey-status").height() : 0;
            if(jq(this).hasClass('open')) {
                jq(this).removeClass('open').next().slideUp();
                jq("#genkey-dialog").dialog("option", "minHeight", 250 + height);
            } else {
                jq(this).parent().find('li.trigger').removeClass('open').next().filter(':visible').slideUp();
                jq(this).addClass('open').next().slideDown();
                jq("#genkey-dialog").dialog("option", "minHeight", 410 + height);
            }
        });
    });

});
/* ]]> */
