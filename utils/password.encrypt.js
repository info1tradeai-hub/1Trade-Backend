import crypto from "crypto";

class SrPassword {
  constructor({
    secret = process.env.ENCRYPT_DATA_SECRET || "1234567890",
    length = 20,
  } = {}) {
    if (!secret) throw new Error("Secret key is required.");
    this.secret = secret;
    this.length = length;
  }

  getRandomChars(length) {
    const chars = this.secret;
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  encrypt(text) {
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      crypto.createHash("sha256").update(this.secret).digest().slice(0, 32),
      Buffer.alloc(16, 0),
    );
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  }

  decrypt(encryptedText) {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      crypto.createHash("sha256").update(this.secret).digest().slice(0, 32),
      Buffer.alloc(16, 0),
    );
    let decrypted = decipher.update(encryptedText, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  hash(password) {
    if (!password) throw new Error("Password is required.");
    const passwordLength = password.length;
    const prefix = this.getRandomChars(this.length / 2);
    const suffix = this.getRandomChars(this.length);

    const insertIndex = Math.floor(Math.random() * (prefix.length + 1));
    const padded =
      prefix.slice(0, insertIndex) +
      password +
      prefix.slice(insertIndex) +
      suffix;

    const finalString = `${insertIndex
      .toString()
      .padStart(3, "0")}|${passwordLength
      .toString()
      .padStart(3, "0")}|${padded}`;
    return this.encrypt(finalString);
  }

  compare(encryptedPassword, inputPassword = null) {
    try {
      if (!encryptedPassword)
        throw new Error("Encrypted password is required.");

      const decrypted = this.decrypt(encryptedPassword);
      if (!decrypted)
        throw new Error("Decryption failed. Possibly wrong secret.");

      const parts = decrypted.split("|");
      if (parts.length !== 3) throw new Error("Invalid encrypted format.");

      const [insertIndexStr, passwordLengthStr, rest] = parts;
      const insertIndex = parseInt(insertIndexStr, 10);
      const passwordLength = parseInt(passwordLengthStr, 10);

      if (isNaN(insertIndex) || isNaN(passwordLength)) {
        throw new Error("Invalid encrypted metadata.");
      }

      const extracted = rest.slice(insertIndex, insertIndex + passwordLength);

      if (inputPassword) {
        return extracted === inputPassword;
      }

      return extracted;
    } catch (err) {
      console.error("❌ Password comparison failed:", err.message);
      return false;
    }
  }
}

// ✅ Create default instance using env secret
const defaultInstance = new SrPassword({});

export { SrPassword };
export const hash = defaultInstance.hash.bind(defaultInstance);
export const compare = defaultInstance.compare.bind(defaultInstance);
