import crypto from 'crypto';
import { promisify } from 'util';

export class DigitalSignature {
  constructor() {
    this.algorithm = 'sha256';
    this.keyOptions = {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    };
  }

  /**
   * Gera um par de chaves RSA para assinatura digital
   * @returns {Promise<{publicKey: string, privateKey: string}>}
   */
  async generateKeyPair() {
    const generateKeyPair = promisify(crypto.generateKeyPair);
    
    try {
      const { publicKey, privateKey } = await generateKeyPair('rsa', this.keyOptions);
      
      return {
        publicKey,
        privateKey,
        algorithm: 'RSA',
        keyLength: 2048,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Erro ao gerar par de chaves: ${error.message}`);
    }
  }

  /**
   * Cria uma assinatura digital para um documento
   * @param {string|Object} document - Documento a ser assinado
   * @param {string} privateKey - Chave privada em formato PEM
   * @param {Object} metadata - Metadados adicionais
   * @returns {Promise<Object>}
   */
  async signDocument(document, privateKey, metadata = {}) {
    try {
      // Converter documento para string se for objeto
      const documentString = typeof document === 'string' 
        ? document 
        : JSON.stringify(document, Object.keys(document).sort());

      // Criar hash do documento
      const documentHash = crypto
        .createHash(this.algorithm)
        .update(documentString)
        .digest('hex');

      // Criar assinatura
      const sign = crypto.createSign(`${this.algorithm}WithRSA`);
      sign.update(documentHash);
      sign.end();

      const signature = sign.sign(privateKey, 'base64');

      // Timestamp da assinatura
      const timestamp = new Date().toISOString();

      // Extrair chave pública da chave privada para verificação
      const publicKey = this.extractPublicKeyFromPrivate(privateKey);

      const signatureData = {
        digitalSignature: signature,
        documentHash,
        algorithm: `${this.algorithm}WithRSA`,
        timestamp,
        signerPublicKey: publicKey,
        metadata: {
          ...metadata,
          signatureSize: Buffer.from(signature, 'base64').length,
          encoding: 'base64'
        }
      };

      return {
        success: true,
        signature: signatureData,
        documentHash
      };

    } catch (error) {
      throw new Error(`Erro ao assinar documento: ${error.message}`);
    }
  }

  /**
   * Verifica uma assinatura digital
   * @param {string|Object} document - Documento original
   * @param {Object} signatureData - Dados da assinatura
   * @returns {Promise<Object>}
   */
  async verifySignature(document, signatureData) {
    try {
      const {
        digitalSignature,
        documentHash: originalHash,
        algorithm,
        signerPublicKey
      } = signatureData;

      // Recalcular hash do documento
      const documentString = typeof document === 'string' 
        ? document 
        : JSON.stringify(document, Object.keys(document).sort());

      const currentHash = crypto
        .createHash(this.algorithm)
        .update(documentString)
        .digest('hex');

      // Verificar se o documento foi alterado
      const documentIntact = currentHash === originalHash;

      if (!documentIntact) {
        return {
          valid: false,
          reason: 'DOCUMENT_MODIFIED',
          message: 'Documento foi modificado após a assinatura',
          details: {
            originalHash,
            currentHash,
            documentIntact: false
          }
        };
      }

      // Verificar assinatura
      const verify = crypto.createVerify(algorithm);
      verify.update(originalHash);
      verify.end();

      const signatureValid = verify.verify(
        signerPublicKey,
        digitalSignature,
        'base64'
      );

      if (!signatureValid) {
        return {
          valid: false,
          reason: 'INVALID_SIGNATURE',
          message: 'Assinatura digital inválida',
          details: {
            documentIntact: true,
            signatureValid: false
          }
        };
      }

      return {
        valid: true,
        message: 'Assinatura digital válida',
        details: {
          documentIntact: true,
          signatureValid: true,
          algorithm,
          timestamp: signatureData.timestamp
        }
      };

    } catch (error) {
      return {
        valid: false,
        reason: 'VERIFICATION_ERROR',
        message: `Erro na verificação: ${error.message}`,
        details: {
          error: error.message
        }
      };
    }
  }

  /**
   * Extrai chave pública de uma chave privada
   * @param {string} privateKey - Chave privada em formato PEM
   * @returns {string}
   */
  extractPublicKeyFromPrivate(privateKey) {
    try {
      const keyObject = crypto.createPrivateKey(privateKey);
      return crypto.createPublicKey(keyObject).export({
        type: 'spki',
        format: 'pem'
      });
    } catch (error) {
      throw new Error(`Erro ao extrair chave pública: ${error.message}`);
    }
  }

  /**
   * Cria um hash seguro de um documento para armazenamento
   * @param {string|Object} document - Documento
   * @returns {string}
   */
  createDocumentHash(document) {
    const documentString = typeof document === 'string' 
      ? document 
      : JSON.stringify(document, Object.keys(document).sort());

    return crypto
      .createHash('sha256')
      .update(documentString)
      .digest('hex');
  }

  /**
   * Gera um timestamp RFC 3161 (simulado)
   * @param {string} data - Dados para timestamp
   * @returns {Promise<string>}
   */
  async generateTimestamp(data) {
    try {
      // Implementação simplificada - em produção usar TSA real
      const timestamp = new Date().toISOString();
      const hash = crypto
        .createHash('sha256')
        .update(data + timestamp)
        .digest('hex');

      return {
        timestamp,
        token: Buffer.from(JSON.stringify({
          timestamp,
          hash,
          tsa: 'internal-tsa'
        })).toString('base64')
      };
    } catch (error) {
      throw new Error(`Erro ao gerar timestamp: ${error.message}`);
    }
  }

  /**
   * Verifica um timestamp RFC 3161 (simulado)
   * @param {string} token - Token do timestamp
   * @param {string} data - Dados originais
   * @returns {Promise<boolean>}
   */
  async verifyTimestamp(token, data) {
    try {
      const timestampData = JSON.parse(
        Buffer.from(token, 'base64').toString()
      );

      const expectedHash = crypto
        .createHash('sha256')
        .update(data + timestampData.timestamp)
        .digest('hex');

      return expectedHash === timestampData.hash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cria uma representação canônica de um documento para assinatura
   * @param {Object} document - Documento
   * @returns {string}
   */
  canonicalizeDocument(document) {
    // Remove campos que não devem ser incluídos na assinatura
    const excludeFields = [
      '_id', '__v', 'createdAt', 'updatedAt', 'signature', 'history'
    ];

    const cleanDocument = { ...document };
    excludeFields.forEach(field => delete cleanDocument[field]);

    // Ordenar chaves para garantir consistência
    return JSON.stringify(cleanDocument, Object.keys(cleanDocument).sort());
  }

  /**
   * Valida formato de chave PEM
   * @param {string} key - Chave em formato PEM
   * @param {string} type - Tipo da chave ('private' ou 'public')
   * @returns {boolean}
   */
  validateKeyFormat(key, type = 'private') {
    try {
      if (type === 'private') {
        crypto.createPrivateKey(key);
      } else {
        crypto.createPublicKey(key);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Criptografa dados sensíveis usando chave pública
   * @param {string} data - Dados para criptografar
   * @param {string} publicKey - Chave pública
   * @returns {string}
   */
  encryptWithPublicKey(data, publicKey) {
    try {
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(data)
      );

      return encrypted.toString('base64');
    } catch (error) {
      throw new Error(`Erro na criptografia: ${error.message}`);
    }
  }

  /**
   * Descriptografa dados usando chave privada
   * @param {string} encryptedData - Dados criptografados em base64
   * @param {string} privateKey - Chave privada
   * @returns {string}
   */
  decryptWithPrivateKey(encryptedData, privateKey) {
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(encryptedData, 'base64')
      );

      return decrypted.toString();
    } catch (error) {
      throw new Error(`Erro na descriptografia: ${error.message}`);
    }
  }

  /**
   * Gera hash seguro de senha para armazenamento de chave privada
   * @param {string} password - Senha
   * @param {string} salt - Salt (opcional)
   * @returns {Object}
   */
  hashPassword(password, salt = null) {
    const saltBytes = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, saltBytes, 100000, 64, 'sha512');
    
    return {
      hash: hash.toString('hex'),
      salt: saltBytes
    };
  }

  /**
   * Verifica senha contra hash
   * @param {string} password - Senha
   * @param {string} hash - Hash armazenado
   * @param {string} salt - Salt usado
   * @returns {boolean}
   */
  verifyPassword(password, hash, salt) {
    const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return hashToVerify.toString('hex') === hash;
  }
}

// Instância singleton
export const digitalSignature = new DigitalSignature();

// Funções de conveniência
export const generateKeyPair = () => digitalSignature.generateKeyPair();
export const signDocument = (document, privateKey, metadata) => 
  digitalSignature.signDocument(document, privateKey, metadata);
export const verifySignature = (document, signatureData) => 
  digitalSignature.verifySignature(document, signatureData);
export const createDocumentHash = (document) => 
  digitalSignature.createDocumentHash(document);