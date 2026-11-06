export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailAdapter = {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string }>;
};
