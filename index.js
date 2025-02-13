const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 从配置文件读取域名列表
const loadDefaultDomains = () => {
  try {
    const domainsPath = path.join(__dirname, 'domains.txt');
    const content = fs.readFileSync(domainsPath, 'utf8');
    return content.split('\n').filter(domain => domain.trim() !== '');
  } catch (error) {
    console.error('Error reading domains.txt:', error.message);
    return [];
  }
};

// 获取证书的 SHA1
const asyncGetCertInfo = async (domain) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      port: 443,
      method: 'GET',
      rejectUnauthorized: false, // 请注意这可能会带来安全风险
      agent: new https.Agent({ keepAlive: false })
    };
    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate(true);
      if (cert && Object.keys(cert).length !== 0) {
        const sha1 = crypto.createHash('sha1').update(Buffer.from(cert.raw)).digest('hex').toLowerCase();
        const certData = {
          sha1,
          // updateAt: new Date().toISOString() // 存储获取信息的当前时间
        };
        resolve(certData);
      } else {
        reject(new Error('Certificate not found'));
      }
      res.socket.end();
    });
    req.on('error', (error) => {
      reject(new Error('Error fetching certificate: ' + error.message));
    });
    req.end();
  });
};

// 将新域名添加到配置文件
const addDomainToConfig = (domain) => {
  try {
    const domainsPath = path.join(__dirname, 'domains.txt');
    const existingDomains = loadDefaultDomains();
    
    // 检查域名是否已存在
    if (!existingDomains.includes(domain)) {
      fs.appendFileSync(domainsPath, `\n${domain}`);
      console.log(`Added ${domain} to domains.txt`);
    }
  } catch (error) {
    console.error('Error updating domains.txt:', error.message);
  }
};

// 更新域名证书信息
const updateCertInfo = async (domain, isFromCommandLine = false) => {
  try {
    const certInfo = await asyncGetCertInfo(domain);
    const filePath = path.join(__dirname, `${domain}.json`);
    fs.writeFileSync(filePath, JSON.stringify(certInfo, null, 2));
    console.log(`Updated cert info for ${domain}: ${certInfo.sha1}`);
    
    // 如果是通过命令行参数传入的域名，则添加到配置文件
    if (isFromCommandLine) {
      addDomainToConfig(domain);
    }
  } catch (error) {
    console.error(`Failed to update cert info for ${domain}:`, error.message);
  }
};

// 解析传递的域名或使用默认列表
const runUpdate = async () => {
  let domains;
  let isFromCommandLine = false;

  // 获取从命令行传递的所有域名参数
  const domainArgs = process.argv.slice(2);  // 获取从第3个参数开始的所有参数
  if (domainArgs.length > 0) {
    // 如果传入了域名参数，使用这些域名
    domains = domainArgs;
    isFromCommandLine = true;
  } else {
    // 如果没有传入域名，使用配置文件中的域名列表
    domains = loadDefaultDomains();
  }

  // 遍历域名列表并更新每个域名的证书信息
  for (const domain of domains) {
    await updateCertInfo(domain.trim(), isFromCommandLine);
  }
};

// 执行更新
runUpdate();
