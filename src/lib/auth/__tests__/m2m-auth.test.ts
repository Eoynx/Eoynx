/**
 * M2M 인증 모듈 테스트
 */

import { generateAgentToken, verifyAgentToken, registerAgent, getRegisteredAgent } from '@/lib/auth/m2m-auth';
import type { AgentIdentity } from '@/types';

describe('M2M Authentication', () => {
  const mockAgent: AgentIdentity = {
    id: 'test-agent-001',
    name: 'TestAgent',
    provider: 'openai',
    version: '1.0.0',
    capabilities: ['search', 'execute'],
  };

  describe('generateAgentToken', () => {
    it('should generate a valid JWT token', async () => {
      const result = await generateAgentToken(mockAgent);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include agent information in token result', async () => {
      const result = await generateAgentToken(mockAgent);
      
      expect(result.agentId).toBe(mockAgent.id);
      expect(result.permissions).toBeDefined();
      expect(Array.isArray(result.permissions)).toBe(true);
    });

    it('should include expiration time', async () => {
      const result = await generateAgentToken(mockAgent);
      
      expect(result.issuedAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt).toBeGreaterThan(result.issuedAt);
    });

    it('should accept custom scopes', async () => {
      const customScopes = ['products:read', 'orders:write'];
      const result = await generateAgentToken(mockAgent, customScopes);
      
      expect(result.scopes).toEqual(customScopes);
    });
  });

  describe('verifyAgentToken', () => {
    it('should verify a valid token', async () => {
      const { token } = await generateAgentToken(mockAgent);

      const result = await verifyAgentToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.agentId).toBe(mockAgent.id);
    });

    it('should return invalid for malformed token', async () => {
      const invalidToken = 'invalid.token.here';
      
      const result = await verifyAgentToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return invalid for empty token', async () => {
      const result = await verifyAgentToken('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Agent Registration', () => {
    it('should register and retrieve an agent', () => {
      registerAgent(mockAgent);
      
      const retrieved = getRegisteredAgent(mockAgent.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mockAgent.id);
      expect(retrieved?.name).toBe(mockAgent.name);
    });

    it('should return undefined for unknown agent', () => {
      const result = getRegisteredAgent('unknown-agent-id');
      
      expect(result).toBeUndefined();
    });
  });
});
