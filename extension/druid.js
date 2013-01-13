    var ext = chrome.extension.getBackgroundPage();

    $(function(){
        $('#tabs').tabs();
        $('.next-button').button().click(function(e) {
            selected = $("#tabs").tabs("option", "selected");
            end = $("#tabs").tabs("length");
            if (selected + 1 < end) {
                $("#tabs").tabs("option", "selected",  selected + 1);
                if (selected + 1 == 2)
                    $("#options_frame").attr("src", chrome.extension.getURL('options.html') + "?tab=1");
            } else {
                window.close();
            }
            ext.gpgauth_prefs.gpgauth_enabled.set(true);
            localStorage.config_complete = true;
        });

        $('.prev-button').button().click(function(e) {
            selected = $("#tabs").tabs("option", "selected");
            if (selected - 1 > -1) {
                $("#tabs").tabs("option", "selected",  selected - 1);
            }
        });


        $('#trust-level-sel').ready(function(e){
            trust_level = window.ext.gpgauth_prefs.trust_level.get();
            $(this).find('#trust-list').children().eq(trust_level).addClass('selected');
            $(this).find('#trust-level-desc').children().eq(trust_level).addClass('selected');
        });
        $('.level').click(function(e){
            $(this).parent().find('.selected').removeClass('selected');
            $(this).addClass('selected');
            $('#trust-level-desc').children('.selected').removeClass('selected');
            current_index = $(this).parent().find('span').index(this);
            $('#trust-level-desc').children().eq(current_index).addClass('selected');
            window.ext.gpgauth_prefs.trust_level.set(current_index);
        });
        $('.trust-level-desc').click(function(e){
            $(this).parent().find('.selected').removeClass('selected');
            $(this).addClass('selected');
            current_index = $(this).parent().find('div').index(this);
            $('#trust-list').children('.selected').removeClass('selected');
            $('#trust-list').children().eq(current_index).addClass('selected');
            window.ext.gpgauth_prefs.trust_level.set(current_index);
        });

        $('#tabs-1').ready(function(){
            doSystemCheck();
        });
        $('#tab-1-btn').click(function(){
            doSystemCheck();
        });
        $('#tabs-2').ready(function(){
            ext.gpgauth_prefs.gpgauth_enabled.set(true);
            localStorage.config_complete = true;
        });
        errors = {};
        function doSystemCheck() {
            pf = window.clientInformation.platform.substr(0,3);
            platform = "";
            if (pf == "Win") {
                platform = "-mswindows";
            }
            if (pf == "Mac") {
                platform = "-macosx";
            }
            if (ext.plugin && ext.plugin.valid) {
                gpg_status = ext.plugin.webpg_status;
                errors = {
                    'NPAPI' : { 'error' : false, 'detail': "The NPAPI Plugin is valid." },
                    'libgpgme' : { 'error' : false, 'detail' : "It appears you have a working version of libgpgme; we have detected version: " + gpg_status.gpgme_version },
                    'gpg_agent' : { 'error' : false, 'detail' : "It appears you have a key-agent configured" },
                    'gpgconf' : { 'error' : false, 'detail' : "gpgconf was detected; you can use the signature methods" },
                };
                console.log(errors['NPAPI']['detail']);

                if (!gpg_status.gpgme_valid) {
                    errors['libgpgme'] = {
                        'error': true,
                        'detail': "You do not appear to have libgpgme; libgpgme is required.",
                        'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-libgpgme",
                    }
                }
                console.log(errors['libgpgme']['detail']);

                if (!gpg_status.gpg_agent_info) {
                    errors['gpg_agent'] = {
                        'error': true,
                        'detail': "You do not appear to have a key-agent configured. A working key-agent is required",
                        'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-libgpgme",
                    }
                }
                console.log(errors['gpg_agent']['detail']);

                if (!gpg_status.gpgconf_detected) {
                    errors['gpgconf'] = {
                        'error': true,
                        'detail': "gpgconf does not appear to be installed; You will not be able to create signatures",
                        'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-gpgconf",
                    }
                }
                console.log(errors['gpgconf']['detail']);

            } else {
                errors = {
		        "NPAPI" : {
                        'error': true,
                        'detail': "There was a problem loading the plugin; the issue might be caused by the plugin being incompatibly compiled for this architechture.",
                        'link' : null,
                    }
	            }
                console.log(errors['NPAPI']['detail']);
            }
        }
        show_refresh = false;
        for (error in errors) {
            if (errors[error]['error']) {
                document.getElementById('system-good').style.display = 'none';
                document.getElementById('system-error').style.display = 'block';
                show_refresh = true;
            }
            extra_class = (errors[error]['error'] && error != 'gpgconf') ? ' error' : '';
            extra_class = (errors[error]['error'] && error == 'gpgconf') ? ' warning' : extra_class;
            item_result = "<div class=\"trust-level-desc" + extra_class + "\">" +
                    "<span class=\"system-check\" style=\"margin-right:8px;\"><img src='images/";
            if (errors[error]['error']) {
                item_result += 'cancel.png';
            } else {
                item_result += 'check.png';
            }
            item_result += "'></span>" +
                    "<span class=\"trust-desc\">" + errors[error]['detail'];
            if (errors[error]['error'] && errors[error]['link']) item_result += " - <a href=\"" + errors[error]['link'] + platform + "/\" target=\"new\">click here for help resolving this issue</a>";
            item_result += "</span>";
            document.getElementById('status_result').innerHTML += item_result;
        }
        if (show_refresh) {
            document.getElementById('status_result').innerHTML += "<input type='button' value='Refresh' class='recheck-button'/>";
        }
        $('.recheck-button').button().click(function(e) {
            doSystemCheck();
        });

        $('#tab-3-btn').click(function(){
            $("#options_frame").attr("src", chrome.extension.getURL('options.html') + "?tab=1");
        });
        $("#options_frame").load(function(){
            options_frame = this.contentWindow.document.body;
            $(options_frame).css("width", "90%")
            $(options_frame).css("margin", "auto")
            options_frame.removeChild($(options_frame).find("#header")[0]);
            options_frame.removeChild($(options_frame).find("#setup_link")[0]);
            ul = $(options_frame).find("ul");
            ul.parent()[0].removeChild(ul[0]);
            buttons = $(options_frame).find("#window_functions");
            buttons.parent()[0].removeChild(buttons[0]);
        });

    });
