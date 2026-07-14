/*
 * Mihomo JavaScript 覆写 - Android 专用最终版（FCM + Claude）
 * 适用：Clash Party / Mihomo Party / Clash Verge Rev 等支持 main(config) 的客户端
 *
 * 使用方式：
 * 1. 正常导入你的节点订阅。
 * 2. 新建 JavaScript 覆写，导入本文件。
 * 3. 将本覆写绑定到对应订阅。
 *
 * 本脚本保留订阅中的 proxies 和 proxy-providers，
 * 仅重建通用设置、TUN、DNS、策略组和规则。
 */

function main(config) {
  if (!config || typeof config !== "object") {
    throw new Error("无效的订阅配置");
  }

  var testUrl = "https://www.gstatic.com/generate_204";

  var filters = {
    hongKong: "(?i)(香港|港节点|\\bHK\\b|Hong ?Kong)",
    japan: "(?i)(日本|东京|東京|大阪|埼玉|\\bJP\\b|Japan|Tokyo|Osaka)",
    singapore: "(?i)(新加坡|狮城|獅城|\\bSG\\b|Singapore)",
    unitedStates: "(?i)(美国|美國|美西|美东|美東|洛杉矶|洛杉磯|西雅图|西雅圖|圣何塞|聖何塞|纽约|紐約|达拉斯|達拉斯|\\bUS\\b|\\bUSA\\b|United States|Los Angeles|Seattle|San Jose|New York|Dallas)",
  };

  var knownRegionFilter =
    "(?i)(" +
    "香港|港节点|\\bHK\\b|Hong ?Kong|" +
    "日本|东京|東京|大阪|埼玉|\\bJP\\b|Japan|Tokyo|Osaka|" +
    "新加坡|狮城|獅城|\\bSG\\b|Singapore|" +
    "美国|美國|美西|美东|美東|洛杉矶|洛杉磯|西雅图|西雅圖|圣何塞|聖何塞|纽约|紐約|达拉斯|達拉斯|\\bUS\\b|\\bUSA\\b|United States|Los Angeles|Seattle|San Jose|New York|Dallas|" +
    ")";

  function manualGroup(name, filter) {
    return {
      name: name,
      type: "select",
      "include-all": true,
      filter: filter
    };
  }

  var invalidNodeFilter =
    "(?i)(剩余流量|流量剩余|到期|过期|有效期|套餐|官网|网站|客服|公告|群组|邀请|重置|traffic|expire|expiry|website|official|support)";

  function autoGroup(name, filter) {
    return {
      name: name,
      type: "url-test",
      "include-all": true,
      filter: filter,
      "exclude-filter": invalidNodeFilter,
      "exclude-type": "Direct",
      url: testUrl,
      interval: 120,
      tolerance: 30,
      lazy: true,
      timeout: 3000,
      "max-failed-times": 1,
      "expected-status": 204,
      hidden: true
    };
  }

  // FCM 长连接更重视出口稳定性，不按延迟频繁换节点。
  // fallback 会保持当前可用节点，仅在节点不可用时切换。
  function fcmStableRegionGroup(name, filter) {
    return {
      name: name,
      type: "fallback",
      "include-all": true,
      filter: filter,
      "exclude-filter": invalidNodeFilter,
      "exclude-type": "Direct",
      url: testUrl,
      interval: 120,
      lazy: true,
      timeout: 3000,
      "max-failed-times": 1,
      "expected-status": 204,
      hidden: true
    };
  }

  // 为订阅型 proxy-provider 补充健康检查。
  // 保留订阅原有参数，仅补充可靠的缺省值。
  if (config["proxy-providers"] && typeof config["proxy-providers"] === "object") {
    Object.keys(config["proxy-providers"]).forEach(function (providerName) {
      var provider = config["proxy-providers"][providerName];

      if (provider && typeof provider === "object") {
        var healthCheck = provider["health-check"] || {};

        healthCheck.enable = true;

        if (!healthCheck.url) {
          healthCheck.url = testUrl;
        }

        if (!healthCheck.interval) {
          healthCheck.interval = 600;
        }

        if (!healthCheck.timeout) {
          healthCheck.timeout = 3000;
        }

        if (typeof healthCheck.lazy !== "boolean") {
          healthCheck.lazy = true;
        }

        if (
          healthCheck.url === testUrl &&
          typeof healthCheck["expected-status"] === "undefined"
        ) {
          healthCheck["expected-status"] = 204;
        }

        provider["health-check"] = healthCheck;
      }
    });
  }

  config["mode"] = "rule";
  config["ipv6"] = true;
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;
  config["find-process-mode"] = "strict";

  config["profile"] = {
    "store-selected": true,
    "store-fake-ip": true
  };

  config["geodata-mode"] = true;
  config["geodata-loader"] = "memconservative";
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  config["geox-url"] = {
    geoip: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
    geosite: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
    mmdb: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb"
  };

  config["tun"] = {
    enable: true,
    stack: "mixed",
    "auto-route": true,
    "auto-detect-interface": true,
    "strict-route": true,
    "dns-hijack": [
      "any:53",
      "tcp://any:53"
    ]
  };

  config["sniffer"] = {
    enable: true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": false,
    sniff: {
      HTTP: {
        ports: [80, "8080-8880"],
        "override-destination": true
      },
      TLS: {
        ports: [443, 5228, 5229, 5230, 8443]
      },
      QUIC: {
        ports: [443, 8443]
      }
    }
  };

  config["dns"] = {
    enable: true,
    ipv6: true,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-range6": "fdfe:dcba:9876::1/64",
    "cache-algorithm": "arc",
    "prefer-h3": false,
    "respect-rules": true,
    "use-hosts": true,
    "use-system-hosts": false,
    "fake-ip-filter": [
      "*.lan",
      "*.local",
      "localhost",
      "+.msftconnecttest.com",
      "+.msftncsi.com",
      "time.*.com",
      "time.*.gov",
      "pool.ntp.org"
    ],
    "default-nameserver": [
      "223.5.5.5",
      "119.29.29.29"
    ],
    "proxy-server-nameserver": [
      "https://doh.pub/dns-query#DIRECT",
      "https://dns.alidns.com/dns-query#DIRECT"
    ],
    nameserver: [
      "https://1.1.1.1/dns-query#DNS-PROXY",
      "https://8.8.8.8/dns-query#DNS-PROXY"
    ],
    "nameserver-policy": {
      "geosite:private,cn,steam@cn,category-games@cn": [
        "https://doh.pub/dns-query#DIRECT",
        "https://dns.alidns.com/dns-query#DIRECT"
      ]
    }
  };

  config["proxy-groups"] = [
    // ========================================================
    // 第一部分：日常业务策略
    // ========================================================
    {
      name: "默认代理",
      type: "select",
      proxies: [
        "稳定自动",
        "全局测速",
        "香港自动",
        "新加坡自动",
        "日本自动",
        "美国自动",
        "其他自动",
        "香港节点",
        "新加坡节点",
        "日本节点",
        "美国节点",
        "其他节点",
        "全部节点"
      ]
    },
    {
      name: "AI服务",
      type: "select",
      proxies: [
        "美国自动",
        "新加坡自动",
        "日本自动",
        "香港自动",
        "稳定自动",
        "美国节点",
        "新加坡节点",
        "日本节点",
        "香港节点",
        "其他节点",
        "全部节点"
      ]
    },
    {
      name: "Google服务",
      type: "select",
      proxies: [
        "新加坡自动",
        "日本自动",
        "美国自动",
        "香港自动",
        "稳定自动",
        "新加坡节点",
        "日本节点",
        "美国节点",
        "香港节点",
        "其他节点",
        "全部节点"
      ]
    },
    {
      name: "FCM推送",
      type: "select",
      proxies: [
        "FCM稳定",
        "新加坡FCM稳定",
        "日本FCM稳定",
        "香港FCM稳定",
        "美国FCM稳定",
        "其他FCM稳定",
        "新加坡节点",
        "日本节点",
        "香港节点",
        "美国节点",
        "其他节点",
        "稳定自动",
        "DIRECT",
        "全部节点"
      ]
    },
    {
      name: "Telegram",
      type: "select",
      proxies: [
        "新加坡自动",
        "香港自动",
        "日本自动",
        "美国自动",
        "稳定自动",
        "新加坡节点",
        "香港节点",
        "日本节点",
        "美国节点",
        "其他节点",
        "全部节点"
      ]
    },
    {
      name: "Emby",
      type: "select",
      proxies: [
        "稳定自动",
        "香港自动",
        "日本自动",
        "新加坡自动",
        "美国自动",
        "其他自动",
        "香港节点",
        "日本节点",
        "新加坡节点",
        "美国节点",
        "其他节点",
        "DIRECT",
        "全部节点"
      ]
    },
    {
      name: "Spotify",
      type: "select",
      proxies: [
        "DIRECT",
        "稳定自动",
        "香港自动",
        "日本自动",
        "新加坡自动",
        "美国自动",
        "其他自动",
        "香港节点",
        "日本节点",
        "新加坡节点",
        "美国节点",
        "其他节点",
        "全部节点"
      ]
    },
    {
      name: "Steam商店社区",
      type: "select",
      proxies: [
        "香港自动",
        "日本自动",
        "新加坡自动",
        "稳定自动",
        "美国自动",
        "其他自动",
        "香港节点",
        "日本节点",
        "新加坡节点",
        "美国节点",
        "其他节点",
        "DIRECT",
        "全部节点"
      ]
    },
    {
      name: "游戏联机",
      type: "select",
      proxies: [
        "DIRECT",
        "香港自动",
        "日本自动",
        "新加坡自动",
        "美国自动",
        "稳定自动",
        "香港节点",
        "日本节点",
        "新加坡节点",
        "美国节点",
        "其他节点",
        "全部节点"
      ]
    },

    // ========================================================
    // 第二部分：地区手动选择
    // ========================================================
    manualGroup("香港节点", filters.hongKong),
    manualGroup("新加坡节点", filters.singapore),
    manualGroup("日本节点", filters.japan),
    manualGroup("美国节点", filters.unitedStates),
    {
      name: "其他节点",
      type: "select",
      "include-all": true,
      "exclude-filter": knownRegionFilter,
      "exclude-type": "Compatible"
    },
    {
      name: "全部节点",
      type: "select",
      "include-all": true
    },

    // ========================================================
    // 第三部分：内部自动策略
    // hidden: true，客户端支持时不在顶层显示
    // ========================================================
    {
      name: "稳定自动",
      type: "fallback",
      proxies: [
        "香港自动",
        "新加坡自动",
        "日本自动",
        "美国自动",
        "其他自动"
      ],
      url: testUrl,
      interval: 120,
      timeout: 3000,
      "max-failed-times": 1,
      "expected-status": 204,
      lazy: true,
      hidden: true
    },
    {
      name: "全局测速",
      type: "url-test",
      "include-all": true,
      "exclude-filter": invalidNodeFilter,
      "exclude-type": "Direct",
      url: testUrl,
      interval: 120,
      tolerance: 30,
      timeout: 3000,
      "max-failed-times": 1,
      "expected-status": 204,
      lazy: true,
      hidden: true
    },
    autoGroup("香港自动", filters.hongKong),
    autoGroup("新加坡自动", filters.singapore),
    autoGroup("日本自动", filters.japan),
    autoGroup("美国自动", filters.unitedStates),
    {
      name: "其他自动",
      type: "url-test",
      "include-all": true,
      "exclude-filter": "(?i)(" +
        knownRegionFilter.slice(5, -1) + "|" +
        invalidNodeFilter.slice(5, -1) +
        ")",
      "exclude-type": "Direct",
      url: testUrl,
      interval: 120,
      tolerance: 30,
      timeout: 3000,
      "max-failed-times": 1,
      "expected-status": 204,
      lazy: true,
      hidden: true
    },

    // ========================================================
    // FCM 专用稳定策略
    // 地区内不追逐最低延迟，只在当前节点故障时切换。
    // ========================================================
    {
      name: "FCM稳定",
      type: "fallback",
      proxies: [
        "新加坡FCM稳定",
        "日本FCM稳定",
        "香港FCM稳定",
        "美国FCM稳定",
        "其他FCM稳定"
      ],
      url: testUrl,
      interval: 120,
      timeout: 3000,
      "max-failed-times": 1,
      "expected-status": 204,
      lazy: false,
      hidden: true
    },
    fcmStableRegionGroup("新加坡FCM稳定", filters.singapore),
    fcmStableRegionGroup("日本FCM稳定", filters.japan),
    fcmStableRegionGroup("香港FCM稳定", filters.hongKong),
    fcmStableRegionGroup("美国FCM稳定", filters.unitedStates),
    {
      name: "其他FCM稳定",
      type: "fallback",
      "include-all": true,
      "exclude-filter": "(?i)(" +
        knownRegionFilter.slice(5, -1) + "|" +
        invalidNodeFilter.slice(5, -1) +
        ")",
      "exclude-type": "Direct",
      url: testUrl,
      interval: 120,
      lazy: true,
      timeout: 3000,
      "max-failed-times": 1,
      "expected-status": 204,
      hidden: true
    },

    // DNS 内部出口
    {
      name: "DNS-PROXY",
      type: "select",
      hidden: true,
      proxies: [
        "新加坡自动",
        "日本自动",
        "香港自动",
        "稳定自动",
        "美国自动",
        "其他自动"
      ]
    }
  ];

  config["rules"] = [
    // Android Steam Mobile：整个 App 走商店社区策略。
    // 官方包名：com.valvesoftware.android.steam.community
    "PROCESS-NAME,com.valvesoftware.android.steam.community,Steam商店社区",

    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",

    // Firebase Cloud Messaging / Android Transport Layer
    // 官方主机名与注册端点。
    "DOMAIN-REGEX,^(mtalk|mtalk4|mtalk-staging|mtalk-dev|alt[1-8]-mtalk)\\.google\\.com$,FCM推送",
    "DOMAIN,android.apis.google.com,FCM推送",
    "DOMAIN,device-provisioning.googleapis.com,FCM推送",
    "DOMAIN,firebaseinstallations.googleapis.com,FCM推送",
    "DOMAIN,fcm.googleapis.com,FCM推送",
    "DOMAIN,iid.googleapis.com,FCM推送",

    // FCM 通常使用 TCP 5228，必要时回退到 5229/5230。
    // 使用端口兜底可覆盖直接连接 Google IP、域名不可见等情况。
    "AND,((NETWORK,TCP),(DST-PORT,5228-5230)),FCM推送",

    "DOMAIN-SUFFIX,spotify.com,Spotify",
    "DOMAIN-SUFFIX,spotifycdn.com,Spotify",
    "DOMAIN-SUFFIX,scdn.co,Spotify",
    "DOMAIN-SUFFIX,pscdn.co,Spotify",
    "DOMAIN-SUFFIX,spoti.fi,Spotify",
    "GEOSITE,spotify,Spotify",

    "GEOSITE,steam@cn,DIRECT",
    "GEOSITE,category-games@cn,DIRECT",
    "DOMAIN-SUFFIX,steamcontent.com,DIRECT",

    "DOMAIN-SUFFIX,steamserver.net,游戏联机",

    "DOMAIN,store.steampowered.com,Steam商店社区",
    "DOMAIN,help.steampowered.com,Steam商店社区",
    "DOMAIN,checkout.steampowered.com,Steam商店社区",
    "DOMAIN-SUFFIX,steamcommunity.com,Steam商店社区",
    "DOMAIN-SUFFIX,steamstatic.com,Steam商店社区",
    "DOMAIN-SUFFIX,steam-chat.com,Steam商店社区",
    "DOMAIN-SUFFIX,steamusercontent.com,Steam商店社区",
    "GEOSITE,steam,Steam商店社区",

    "DOMAIN,emby.noteit.eu.org,Emby",
    "DOMAIN,lite.cn2gias.uk,Emby",

    "DOMAIN,gemini.google.com,Google服务",
    "DOMAIN,aistudio.google.com,Google服务",
    "DOMAIN-SUFFIX,ai.google.dev,Google服务",
    "DOMAIN-SUFFIX,generativelanguage.googleapis.com,Google服务",
    "DOMAIN,optimizationguide-pa.googleapis.com,Google服务",
    "DOMAIN,notebooklm.google.com,Google服务",
    "GEOSITE,youtube,Google服务",
    "GEOSITE,google,Google服务",

    // Claude / Anthropic 归入 AI 服务，不单独建立手机端分流。
    "DOMAIN-SUFFIX,anthropic.com,AI服务",
    "DOMAIN-SUFFIX,anthropic-ai.com,AI服务",
    "DOMAIN-SUFFIX,claude.ai,AI服务",
    "DOMAIN-SUFFIX,claude.com,AI服务",
    "DOMAIN-SUFFIX,clau.de,AI服务",
    "DOMAIN-SUFFIX,claudeusercontent.com,AI服务",
    "DOMAIN-SUFFIX,claudemcpclient.com,AI服务",
    "DOMAIN-SUFFIX,claudemcpcontent.com,AI服务",
    "DOMAIN,anthropic.auth0.com,AI服务",
    "DOMAIN,anthropic-com.ghost.io,AI服务",
    "DOMAIN,anthropic.com.cdn.cloudflare.net,AI服务",
    "DOMAIN,servd-anthropic-website.b-cdn.net,AI服务",
    "IP-CIDR,160.79.104.0/23,AI服务,no-resolve",
    "IP-CIDR6,2607:6bc0::/48,AI服务,no-resolve",

    "DOMAIN-SUFFIX,chatgpt.com,AI服务",
    "DOMAIN-SUFFIX,openai.com,AI服务",
    "DOMAIN-SUFFIX,oaistatic.com,AI服务",
    "DOMAIN-SUFFIX,oaiusercontent.com,AI服务",
    "DOMAIN-SUFFIX,perplexity.ai,AI服务",
    "DOMAIN-SUFFIX,x.ai,AI服务",
    "DOMAIN-SUFFIX,grok.com,AI服务",
    "DOMAIN-SUFFIX,copilot.microsoft.com,AI服务",
    "DOMAIN-SUFFIX,githubcopilot.com,AI服务",
    "GEOSITE,openai,AI服务",
    "GEOSITE,category-ai-!cn,AI服务",

    "GEOSITE,telegram,Telegram",

    "GEOSITE,geolocation-!cn,默认代理",
    "GEOSITE,cn,DIRECT",

    "GEOIP,telegram,Telegram,no-resolve",
    "GEOIP,google,Google服务,no-resolve",
    "GEOIP,CN,DIRECT,no-resolve",

    "MATCH,默认代理"
  ];

  return config;
}
