declare module "notifications-node-client" {
  export interface NotifyEmailResponse {
    data: {
      id: string
      reference?: string | null
      content: {
        subject: string
        body: string
        from_email: string
      }
      uri: string
      template: {
        id: string
        version: number
        uri: string
      }
    }
  }

  export interface NotifyTemplateResponse {
    data: {
      id: string
      name: string
      type: string
      version: number
      body: string
      subject?: string
      created_at: string
      created_by: string
      personalisation?: Record<string, unknown>
    }
  }

  export interface NotifyNotificationResponse {
    data: {
      id: string
      reference: string | null
      email_address?: string
      phone_number?: string
      type: string
      status: string
      template: {
        id: string
        version: number
        uri: string
      }
      body: string
      subject?: string
      created_at: string
      sent_at?: string
      completed_at?: string
    }
  }

  export interface NotifyTemplatesResponse {
    data: {
      templates?: Array<{
        id: string
        name: string
        type: string
        version: number
        body: string
        subject?: string
        created_at: string
        created_by: string
      }>
    }
  }

  export class NotifyClient {
    constructor(apiKey: string)

    sendEmail(
      templateId: string,
      emailAddress: string,
      options?: {
        personalisation?: Record<string, unknown>
        reference?: string
        emailReplyToId?: string
      },
    ): Promise<NotifyEmailResponse>

    getTemplateById(templateId: string): Promise<NotifyTemplateResponse>

    getNotificationById(notificationId: string): Promise<NotifyNotificationResponse>

    getAllTemplates(type?: string): Promise<NotifyTemplatesResponse>
  }
}
