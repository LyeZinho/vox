const {
    deriveMasterKey,
    generateKeypair,
    encryptIdentity,
    decryptIdentity,
    signPayload
} = require('./tchat-core.linux-x64-gnu.node');

async function test() {
    console.log("=== TChat Crypto Core Test ===");

    const password = "my_super_secure_password";
    const salt = "user@example.com";

    console.log("[1] Deriving master key via Argon2id...");
    const masterKey = deriveMasterKey(password, salt);
    console.log(`Master Key (hex): ${masterKey.toString('hex')}`);

    console.log("\n[2] Generating Ed25519 Identity...");
    const identity = generateKeypair();
    console.log(`Public Key (hex): ${identity.publicKey.toString('hex')}`);
    // don't print private key in production, but here for test
    console.log(`Private Key (hex): ${identity.privateKey.toString('hex')}`);

    console.log("\n[3] Encrypting Private Key (XChaCha20-Poly1305)...");
    const encryptedFile = encryptIdentity(identity.privateKey, masterKey);
    console.log(`Encrypted blob length: ${encryptedFile.length} bytes`);

    console.log("\n[4] Decrypting Private Key...");
    const decryptedPrivateKey = decryptIdentity(encryptedFile, masterKey);
    console.log(`Decrypted Private Key matches original? ${decryptedPrivateKey.equals(identity.privateKey)}`);

    console.log("\n[5] Signing Payload...");
    const payload = Buffer.from(JSON.stringify({ action: "sendMessage", room: "general" }));
    const signature = signPayload(payload, identity.privateKey);
    console.log(`Signature (base64): ${signature.toString('base64')}`);

    // Checking wrong password
    try {
        const wrongKey = deriveMasterKey("wrong_password", salt);
        decryptIdentity(encryptedFile, wrongKey);
        console.log("FAIL: Should not have decrypted with wrong password!");
    } catch (e) {
        console.log(`\n[6] Wrong Password Check: Caught expected error => ${e.message}`);
    }
}

test().catch(console.error);
