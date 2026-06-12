export default function fetchStub(...args: Parameters<typeof window.fetch>) {
  return window.fetch(...args);
}
export const fetch = fetchStub;
export const Headers = window.Headers;
export const Request = window.Request;
export const Response = window.Response;

