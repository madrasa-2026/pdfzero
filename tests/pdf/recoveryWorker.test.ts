import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib-with-encrypt';
import { testCandidatePassword, testPasswordBatch } from '../../src/lib/pdf/recoveryTester';

describe('PDF Recovery Candidate Verification', () => {
  it('correctly identifies the valid password and rejects invalid passwords', async () => {
    // 1. Create a minimal encrypted PDF
    const newDoc = await PDFDocument.create();
    newDoc.addPage([200, 200]);
    newDoc.encrypt({
      userPassword: '1984',
      ownerPassword: 'owner_master_pwd',
    });
    const encryptedBytes = await newDoc.save({ useObjectStreams: false });

    // 2. Test wrong passwords
    expect(await testCandidatePassword(encryptedBytes, '0000')).toBe(false);
    expect(await testCandidatePassword(encryptedBytes, '1234')).toBe(false);
    expect(await testCandidatePassword(encryptedBytes, 'wrongpass')).toBe(false);

    // 3. Test correct password
    expect(await testCandidatePassword(encryptedBytes, '1984')).toBe(true);
  });

  it('testPasswordBatch finds the password in a batch of candidates', async () => {
    const newDoc = await PDFDocument.create();
    newDoc.addPage([200, 200]);
    newDoc.encrypt({
      userPassword: '0042',
      ownerPassword: 'owner_master_pwd',
    });
    const encryptedBytes = await newDoc.save({ useObjectStreams: false });

    const batch = ['0040', '0041', '0042', '0043', '0044'];
    const result = await testPasswordBatch(encryptedBytes, batch);

    expect(result.found).toBe(true);
    expect(result.password).toBe('0042');
    expect(result.testedCount).toBe(3); // stopped right after 0042
  });

  it('testPasswordBatch returns found=false if not in batch', async () => {
    const newDoc = await PDFDocument.create();
    newDoc.addPage([200, 200]);
    newDoc.encrypt({
      userPassword: '9999',
      ownerPassword: 'owner_master_pwd',
    });
    const encryptedBytes = await newDoc.save({ useObjectStreams: false });

    const batch = ['1111', '2222', '3333'];
    const result = await testPasswordBatch(encryptedBytes, batch);

    expect(result.found).toBe(false);
    expect(result.password).toBeNull();
    expect(result.testedCount).toBe(3);
  });
});
