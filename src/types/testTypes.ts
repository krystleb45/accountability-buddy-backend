export interface IMockRequest {
    body?: Record<string, unknown>;
    query?: Record<string, string | undefined>;
    params?: Record<string, string>;
  }
  
export interface IMockResponse {
    status: jest.Mock;
    json: jest.Mock;
    send: jest.Mock;
  }
  