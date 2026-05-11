export default {
  async fetch(request) {
    const url = new URL(request.url);
    return new Response(`thiiss-me: ${url.host}${url.pathname}\n`, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
