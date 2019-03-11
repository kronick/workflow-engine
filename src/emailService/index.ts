export interface EmailServiceMessage {
  to: string;
  template: string;
  params: { [key: string]: unknown };
}
export interface EmailService {
  sendMessage(msg: EmailServiceMessage): Promise<boolean>;
}

/** Mock e-mail service used for testing */
export class MockEmailService implements EmailService {
  _messages: EmailServiceMessage[] = [];

  sendMessage(msg: EmailServiceMessage) {
    this._messages.push(msg);
    return Promise.resolve(true);
  }

  getMessages() {
    return this._messages;
  }
}
