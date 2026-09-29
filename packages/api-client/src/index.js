export const API_CONTRACT_NAME = 'matflow-http';
export const SUPPORTED_API_MAJOR = 1;

export class MatflowApiError extends Error {
  constructor(message, { status = 0, code = 'matflow_http_error', detail = null } = {}) {
    super(message);
    this.name = 'MatflowApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function assertCompatibleContract(capabilities) {
  const contract = capabilities?.api_contract;
  const major = Number.parseInt(String(contract?.version ?? '').split('.')[0], 10);
  if (contract?.name !== API_CONTRACT_NAME || major !== SUPPORTED_API_MAJOR) {
    throw new MatflowApiError(
      `Incompatible MatFlow API contract. Expected ${API_CONTRACT_NAME} >=1.0 <2.0, received ${contract?.name ?? 'unknown'} ${contract?.version ?? 'unknown'}.`,
      { code: 'incompatible_api_contract', detail: contract },
    );
  }
  return capabilities;
}

export class MatflowApiClient {
  constructor(baseUrl = 'http://127.0.0.1:8000/api', fetchImpl = (...args) => globalThis.fetch(...args)) {
    this.baseUrl = String(baseUrl).replace(/\/$/, '');
    this.fetch = fetchImpl;
  }

  async request(path, options = {}) {
    const response = await this.fetch(`${this.baseUrl}${path}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload.detail;
      const message = typeof detail === 'object' && detail ? detail.message : detail;
      throw new MatflowApiError(message ?? `MatFlow request failed with HTTP ${response.status}.`, {
        status: response.status,
        code: typeof detail === 'object' && detail?.code ? detail.code : 'matflow_http_error',
        detail,
      });
    }
    return payload;
  }

  async capabilities() {
    return assertCompatibleContract(await this.request('/capabilities'));
  }
}

export function createMatflowClient(baseUrl, fetchImpl) {
  return new MatflowApiClient(baseUrl, fetchImpl);
}
