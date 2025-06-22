export default class QiitaApi {
  constructor(accessToken = process.env.QIITA_TOKEN) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://qiita.com/api';

    if (!this.accessToken) {
      throw new Error('Qiita access token `QIITA_TOKEN` is required.');
    }
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async getUser() {
    return await fetch(`${this.baseUrl}/v2/authenticated_user`, {
      method: 'GET',
      headers: this.headers,
    }).then((res) => res.json())
  }
}
