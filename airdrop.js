const { readFileSync } = require("fs");
const sol = require("@solana/web3.js");
const bs58 = require("bs58");

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
};

const checkEligible = (address) => new Promise(async (resolve) => {
    try {
        const data = await fetch(`https://airdrop.sonic.game/api/allocations?wallet=${address}`, {
            headers: {
                ...defaultHeaders,
            }
        }).then(res => res.json());

        if (data.length === 0) {
            resolve(0);
        } else {
            let totalSum = 0;
            data.forEach(e => {
                totalSum += e.total;
            });
            resolve(totalSum);
        }
    } catch (e) {
        print(e);
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

    let elig = 0;
    let notElig = 0;
    for (let index = 0; index < keypairs.length; index++) {
        const publicKey = keypairs[index].publicKey.toBase58();
        const data = await checkEligible(publicKey);

        if (data == 0) {
            console.log(`${extractAddressParts(publicKey)} | You're not eligible`);
            notElig++;
        } else {
            console.log(`${extractAddressParts(publicKey)} | You're eligible for ${data} SONIC`);
            elig++;
        }
        delay(1);
    }
    console.log(`Eligible: ${elig} wallet(s) | Not Eligible: ${notElig} wallet(s)`)
})();