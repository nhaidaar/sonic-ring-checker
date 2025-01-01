const { readFileSync } = require("fs");
const sol = require("@solana/web3.js");
const bs58 = require("bs58");
const nacl = require("tweetnacl");

const keypairs = [];
let defaultHeaders = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.7',
    'content-type': 'application/json',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'sec-gpc': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};

function extractAddressParts(address) {
    const firstThree = address.slice(0, 4);
    const lastFour = address.slice(-4);
    return `${firstThree}...${lastFour}`;
}

function getKeypairFromPrivateKey(privateKey) {
    const decoded = bs58.decode(privateKey);
    return sol.Keypair.fromSecretKey(decoded);
}

const delay = (seconds) => {
    return new Promise((resolve) => {
        return setTimeout(resolve, seconds * 1000);
    });
}

const getLoginToken = (keyPair) => new Promise(async (resolve) => {
    let success = false;
    while (!success) {
        try {
            const message = await fetch(`https://odyssey-api-beta.sonic.game/testnet-v1/auth/sonic/challenge?wallet=${keyPair.publicKey}`, {
                headers: defaultHeaders
            }).then(res => res.json());

            const sign = nacl.sign.detached(Buffer.from(message.data), keyPair.secretKey);
            const signature = Buffer.from(sign).toString('base64');
            const publicKey = keyPair.publicKey.toBase58();
            const addressEncoded = Buffer.from(keyPair.publicKey.toBytes()).toString("base64")
            const authorize = await fetch('https://odyssey-api-beta.sonic.game/testnet-v1/auth/sonic/authorize', {
                method: 'POST',
                headers: defaultHeaders,
                body: JSON.stringify({
                    'address': `${publicKey}`,
                    'address_encoded': `${addressEncoded}`,
                    'signature': `${signature}`
                })
            }).then(res => res.json());

            const token = authorize.data.token;
            success = true;
            resolve(token);
        } catch (e) { }
    }
});

const getRing = (auth) => new Promise(async (resolve) => {
    let success = false;
    while (!success) {
        try {
            const data = await fetch('https://odyssey-api-beta.sonic.game/testnet-v1/dashboard/season', {
                headers: {
                    ...defaultHeaders,
                    'authorization': `${auth}`,
                }
            }).then(res => res.json());

            if (data.data) {
                success = true;
                resolve(data.data);
            }
        } catch (e) { }
    }
});

(async () => {
    // GET PRIVATE KEY
    const listAccounts = readFileSync("./private.txt", "utf-8")
        .split("\n")
        .map((a) => a.trim());
    for (const privateKey of listAccounts) {
        keypairs.push(getKeypairFromPrivateKey(privateKey));
    }
    if (keypairs.length === 0) {
        throw new Error('Please fill at least 1 private key in private.txt');
    }
    console.log(`Checking for ${keypairs.length} accounts...`)

    let ring = 0;
    for (let index = 0; index < keypairs.length; index++) {
        const publicKey = keypairs[index].publicKey.toBase58();
        let token = await getLoginToken(keypairs[index]);

        const data = await getRing(token);
        const season1 = data[0].rings;
        const season2 = data[1].rings;
        const season3 = data[2].rings;

        console.log(`${extractAddressParts(publicKey)} | Season 1: ${season1}, Season 2: ${season2}, Season 3: ${season3}`);
        ring += season1 + season2 + season3;

        delay(3);
    }

    console.log(`Total rings: ${ring}`);
})();