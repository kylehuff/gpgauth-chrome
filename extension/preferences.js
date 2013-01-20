/* <![CDATA[ */
if (typeof(gpgauth)=='undefined') { gpgauth = {}; }

/*
    Class: gpgauth.preferences
        Provides unified getter/setter methods for storing the user/global
        preference items
*/
gpgauth.preferences = {

    /*
        Function: init
            Ensures the definition of gpgauth.background is available to the
            gpgauth.preferences class
    */
    init: function(browserWindow) {
        if (typeof(gpgauth.background)=='undefined')
            gpgauth.background = browserWindow;
    },

    /*
        Class: gpgauth.preferences.gpgauth_enabled
            Provides methods to get/set the "enabled" preference
    */
    gpgauth_enabled: {
        /*
            Function: get
                Provides methods to get the preference item
        */
        get: function() {
            return gpgauth.localStorage.getItem('enabled');
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <bool> The boolean value to set
        */
        set: function(value) {
            gpgauth.localStorage.setItem('enabled', value);
        },
    },

    /*
        Class: gpgauth.preferences.gnupghome
            Provides methods to get/set the "gnupghome" preference
    */
    gnupghome: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            var value = gpgauth.localStorage.getItem('gnupghome');
            return (value && value != -1) ? value : '';
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <str> The string value for GNUPGHOME
        */
        set: function(value) {
            gpgauth.localStorage.setItem('gnupghome', value);
            gpgauth.plugin.gpgSetHomeDir(value);
            (gpgauth.background.hasOwnProperty("gpgauth")) ?
                gpgauth.background.gpgauth.background.init() :
                gpgauth.background.init();
            gpgauth.plugin = (gpgauth.plugin.valid) ? gpgauth.plugin :
                gpgauth.background.gpgauth.plugin;
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function(){
            gpgauth.localStorage.setItem('gnupghome', '');
            gpgauth.plugin.gpgSetHomeDir('');
            (gpgauth.background.hasOwnProperty("gpgauth")) ?
                gpgauth.background.gpgauth.background.init() :
                gpgauth.background.init();
            gpgauth.plugin = (gpgauth.plugin.valid) ? gpgauth.plugin :
                gpgauth.background.gpgauth.plugin;
        },
    },

    /*
        Class: gpgauth.preferences.gnupgbin
            Provides methods to get/set the GnuPG binary execututable
    */
    gnupgbin: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            var value = gpgauth.localStorage.getItem('gnupgbin');
            return (value && value != -1) ? value : '';
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <str> The string value for GNUPGHOME
        */
        set: function(value) {
            gpgauth.localStorage.setItem('gnupgbin', value);
            gpgauth.plugin.gpgSetBinary(value);
            (gpgauth.background.hasOwnProperty("gpgauth")) ?
                gpgauth.background.gpgauth.background.init() :
                gpgauth.background.init();
            gpgauth.plugin = (gpgauth.plugin.valid) ? gpgauth.plugin :
                gpgauth.background.gpgauth.plugin;
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function(){
            gpgauth.localStorage.setItem('gnupgbin', '');
            gpgauth.plugin.gpgSetBinary('');
            (gpgauth.background.hasOwnProperty("gpgauth")) ?
                gpgauth.background.gpgauth.background.init() :
                gpgauth.background.init();
            gpgauth.plugin = (gpgauth.plugin.valid) ? gpgauth.plugin :
                gpgauth.background.gpgauth.plugin;
        },
    },

    /*
        Class: gpgauth.preferences.gpgconf
            Provides methods to get/set the GPGCONF binary execututable
    */
    gpgconf: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            var value = gpgauth.localStorage.getItem('gpgconf');
            return (value && value != -1) ? value : '';
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <str> The string value for GPGCONF
        */
        set: function(value) {
            gpgauth.localStorage.setItem('gpgconf', value);
            gpgauth.plugin.gpgSetGPGConf(value);
            (gpgauth.background.hasOwnProperty("gpgauth")) ?
                gpgauth.background.gpgauth.background.init() :
                gpgauth.background.init();
            gpgauth.plugin = (gpgauth.plugin.valid) ? gpgauth.plugin :
                gpgauth.background.gpgauth.plugin;
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function(){
            gpgauth.localStorage.setItem('gpgconf', '');
            gpgauth.plugin.gpgSetGPGConf('');
            (gpgauth.background.hasOwnProperty("gpgauth")) ?
                gpgauth.background.gpgauth.background.init() :
                gpgauth.background.init();
            gpgauth.plugin = (gpgauth.plugin.valid) ? gpgauth.plugin :
                gpgauth.background.gpgauth.plugin;
        },
    },

    /*
        Class: gpgauth.preferences.enabled_keys
            Provides methods to get/set the "enabled_keys" preference
    */
    enabled_keys: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            var value = gpgauth.localStorage.getItem('enabled_keys');
            return (value && value != -1) ? value.split(",") : [];
        },

        /*
            Function: add
                Provides method to add the preference item

            Parameters:
                keyid - <str> The KeyID to add to the list
        */
        add: function(keyid) {
            var keys_arr = this.get();
            keys_arr.push(keyid);
            gpgauth.localStorage.setItem('enabled_keys', keys_arr);
        },

        /*
            Function: remove
                Provides method to remove the key from the preference item

            Parameters:
                keyid - <str> The KeyID to remove from the list
        */
        remove: function(keyid) {
            var keys_tmp = this.get();
            var keys_arr = [];
            for (key in keys_tmp) {
                if (keys_tmp[key] != keyid) {
                    keys_arr.push(keys_tmp[key]);
                }
            }
            gpgauth.localStorage.setItem('enabled_keys', keys_arr);
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function(){
            gpgauth.localStorage.setItem('enabled_keys', '');
        },

        /*
            Function: length
                Returns the length of items stored in preference
        */
        length: function(){
            return this.get().length;
        },

        /*
            Function: has
                Determines if keyid is contained in the preference item

            Parameters:
                keyid - <str> The KeyID to look for; Returns true/false
        */
        has: function(keyid){
            var key_arr = this.get();
            for (var i = 0; i < this.length(); i++) {
                if (key_arr[i] == keyid)
                    return true;
            }
            return false;
        },
    },

    trust_level: {
        get: function() {
            var value = gpgauth.localStorage.getItem('trust_level');
            return (value && value != -1) ? parseInt(value) : 0;
        },

        set: function(level) {
            if (isNaN(parseInt(level)))
                level = 0;
            gpgauth.localStorage.setItem('trust_level', level);
        },
    },

    /*
        Class: gpgauth.preferences.default_key
            Provides methods to get/set the "default_key" preference
    */
    default_key: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            return gpgauth.plugin.gpgGetPreference('default-key').value
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                keyid - <str> The KeyID to add to the preference item
        */
        set: function(keyid) {
            gpgauth.plugin.gpgSetPreference("default-key", keyid);
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function() {
            gpgauth.plugin.gpgSetPreference('default-key', '');
        },
    },
};

if (gpgauth.utils.detectedBrowser['product'] == "chrome") {
    try {
        gpgauth.browserWindow = chrome.extension.getBackgroundPage();
    } catch (err) {
        // We must be loading from a non-background source, so the method
        //  chrome.extension.getBackgroundPage() is expected to fail.
        gpgauth.browserWindow = null;
    }
    gpgauth.localStorage = window.localStorage;
} else if (gpgauth.utils.detectedBrowser['product'] == "safari") {
    gpgauth.browserWindow = safari.extension.globalPage.contentWindow;
    gpgauth.localStorage = window.localStorage;
// If this is Firefox, set up required objects
} else if (gpgauth.utils.detectedBrowser['vendor'] == "mozilla") {
    gpgauth.wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
    gpgauth.winType = (gpgauth.utils.detectedBrowser['product'] == "thunderbird") ?
        "mail:3pane" : "navigator:browser";
    gpgauth.browserWindow = gpgauth.wm.getMostRecentWindow(gpgauth.winType);
    // We are running on Mozilla, we need to set our localStorage object to
    //  use the 'mozilla.org/preference-service'
    gpgauth.localStorage = {
        getItem: function(item) {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.gpgauth.");
            var prefType = prefs.getPrefType(item);
            return (prefType == 32) ? prefs.getCharPref(item) :
                   (prefType == 64) ? prefs.getIntPref(item).toString() :
                   (prefType == 128) ? prefs.getBoolPref(item).toString() : -1;
        },
        setItem: function(item, value) {
            value = (typeof(value) == "object") ? value.toString() : value;
            var prefType = gpgauth.constants.ff_prefTypes[typeof(value)];
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.gpgauth.");
            return (prefType == 32) ? prefs.setCharPref(item, value) :
                   (prefType == 64) ? prefs.setIntPref(item, value) :
                   (prefType == 128) ? prefs.setBoolPref(item, value): -1;
        },
    }
} else if (gpgauth.utils.detectedBrowser['vendor'] == "opera") {
    gpgauth.browserWindow = opera.extension.bgProcess;
    gpgauth.localStorage = window.localStorage;
}

gpgauth.preferences.init(gpgauth.browserWindow);
/* ]]> */
