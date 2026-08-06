import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Type } from '@sinclair/typebox';

// Import domain validators
import { createExpenseSchema } from './domains/expenses/create/validator';
import { updateExpenseSchema } from './domains/expenses/update/validator';
import { importMembersSchema } from './domains/members/import-members-csv/validator';
import { createOrderSchema } from './domains/shop/create-order/validator';
import { createProductSchema } from './domains/shop/create-product/validator';
import { updateProductSchema } from './domains/shop/update-product/validator';
import { subscribeBodySchema } from './domains/notifications/subscribe/validator';
import { unsubscribeBodySchema } from './domains/notifications/unsubscribe/validator';
import { sendNotificationSchema } from './domains/notifications/shared/validators';

// Define accounting schemas using TypeBox to ensure they are part of the OpenAPI spec
const createSeasonSchema = Type.Object({
  id: Type.String({ description: 'Season identifier, e.g. "25-26"' }),
  name: Type.String({ description: 'Season display name, e.g. "Saison 2025-2026"' }),
  active: Type.Optional(Type.Boolean({ default: false }))
});

const createInvoiceSchema = Type.Object({
  seasonId: Type.String(),
  date: Type.String({ description: 'Invoice date (YYYY-MM-DD)' }),
  dueDate: Type.String({ description: 'Due date (YYYY-MM-DD)' }),
  clientName: Type.String(),
  clientAddress: Type.Optional(Type.String()),
  clientEmail: Type.Optional(Type.String()),
  subject: Type.Optional(Type.String()),
  location: Type.Optional(Type.String()),
  period: Type.Optional(Type.String()),
  attendees: Type.Optional(Type.String()),
  totalAmount: Type.Integer({ description: 'Total invoice amount in cents' }),
  items: Type.Array(
    Type.Object({
      description: Type.String(),
      quantity: Type.Integer({ minimum: 1 }),
      unitPrice: Type.Integer({ description: 'Unit price in cents' }),
      totalPrice: Type.Integer({ description: 'Total price in cents' })
    })
  )
});

const changeInvoiceStatusSchema = Type.Object({
  status: Type.Union([
    Type.Literal('draft'),
    Type.Literal('sent'),
    Type.Literal('paid'),
    Type.Literal('cancelled')
  ])
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('OpenAPI Spec Generator', () => {
  it('should generate openapi.json and match the file on disk', () => {
    const openapiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Nozay Badminton API',
        version: '1.0.0',
        description: 'Verifiable contract between apps/api, apps/admin and apps/storefront'
      },
      paths: {
        '/members/import': {
          post: {
            summary: 'Import members from CSV file',
            tags: ['Members'],
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    $ref: '#/components/schemas/ImportMembersInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Import result report',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      inserted: Type.Integer(),
                      updated: Type.Integer(),
                      errors: Type.Array(Type.String())
                    })
                  }
                }
              }
            }
          }
        },
        '/members': {
          get: {
            summary: 'List and filter members',
            tags: ['Members'],
            parameters: [
              { name: 'season', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'paid', in: 'query', required: false, schema: { type: 'string', enum: ['true', 'false'] } },
              { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
              { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } }
            ],
            responses: {
              200: {
                description: 'Paginated list of members',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Array(Type.Any()),
                      meta: Type.Object({
                        total: Type.Integer(),
                        page: Type.Integer(),
                        limit: Type.Integer(),
                        pages: Type.Integer()
                      })
                    })
                  }
                }
              }
            }
          }
        },
        '/members/{licence}': {
          get: {
            summary: 'Get member by licence number',
            tags: ['Members'],
            parameters: [
              { name: 'licence', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: {
              200: {
                description: 'Member details',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              },
              404: {
                description: 'Member not found'
              }
            }
          }
        },
        '/members/cse': {
          get: {
            summary: 'Get CSE attestation details',
            tags: ['Members'],
            parameters: [
              { name: 'licence', in: 'query', required: true, schema: { type: 'string' } },
              { name: 'season', in: 'query', required: true, schema: { type: 'string' } }
            ],
            responses: {
              200: {
                description: 'CSE attestation details',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/expenses': {
          post: {
            summary: 'Create a new expense note',
            tags: ['Expenses'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateExpenseInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Created expense details',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/expenses/{id}': {
          put: {
            summary: 'Update an existing expense note',
            tags: ['Expenses'],
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UpdateExpenseInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Updated expense details',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/expenses/{id}/approve': {
          post: {
            summary: 'Approve an expense and record transaction',
            tags: ['Expenses'],
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
            ],
            responses: {
              200: {
                description: 'Approved expense',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/expenses/{id}/reject': {
          post: {
            summary: 'Reject an expense',
            tags: ['Expenses'],
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
            ],
            responses: {
              200: {
                description: 'Rejected expense',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/shop/products': {
          post: {
            summary: 'Create a new shop product',
            tags: ['Shop'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateProductInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Created product details',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/shop/products/{id}': {
          put: {
            summary: 'Update shop product details or stock',
            tags: ['Shop'],
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UpdateProductInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Updated product details',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/shop/orders': {
          post: {
            summary: 'Place a new product order',
            tags: ['Shop'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateOrderInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Created order details',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/accounting/seasons': {
          post: {
            summary: 'Create a new accounting season',
            tags: ['Accounting'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateSeasonInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Created season details',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/accounting/invoices': {
          post: {
            summary: 'Create a new invoice',
            tags: ['Accounting'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateInvoiceInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Created invoice details',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        },
        '/accounting/invoices/{id}/status': {
          post: {
            summary: 'Change invoice status',
            tags: ['Accounting'],
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ChangeInvoiceStatusInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Status update status',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean()
                    })
                  }
                }
              }
            }
          }
        },
        '/notifications/subscriptions': {
          post: {
            summary: 'Register a device push subscription for a member account',
            tags: ['Notifications'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SubscribePushInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Stored subscription id',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Object({ id: Type.Integer() })
                    })
                  }
                }
              }
            }
          },
          delete: {
            summary: 'Remove a device push subscription',
            tags: ['Notifications'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UnsubscribePushInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Number of removed subscriptions',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Object({ removed: Type.Integer() })
                    })
                  }
                }
              }
            }
          }
        },
        '/notifications/messages': {
          post: {
            summary: 'Queue a push notification for the selected audience',
            tags: ['Notifications'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SendNotificationInput'
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Queued message summary',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Object({ messageId: Type.Integer(), queued: Type.Integer() })
                    })
                  }
                }
              }
            }
          }
        },
        '/notifications/dispatch': {
          post: {
            summary: 'Drain the pending push delivery queue (also run by the cron trigger)',
            tags: ['Notifications'],
            responses: {
              200: {
                description: 'Dispatch report',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Object({
                        sent: Type.Integer(),
                        failed: Type.Integer(),
                        pruned: Type.Integer(),
                        remaining: Type.Integer()
                      })
                    })
                  }
                }
              }
            }
          }
        },
        '/notifications/overview': {
          get: {
            summary: 'Subscription counters and recent message history',
            tags: ['Notifications'],
            responses: {
              200: {
                description: 'Notification overview',
                content: {
                  'application/json': {
                    schema: Type.Object({
                      success: Type.Boolean(),
                      data: Type.Any()
                    })
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          CreateExpenseInput: createExpenseSchema,
          UpdateExpenseInput: updateExpenseSchema,
          ImportMembersInput: importMembersSchema,
          CreateOrderInput: createOrderSchema,
          CreateProductInput: createProductSchema,
          UpdateProductInput: updateProductSchema,
          CreateSeasonInput: createSeasonSchema,
          CreateInvoiceInput: createInvoiceSchema,
          ChangeInvoiceStatusInput: changeInvoiceStatusSchema,
          SubscribePushInput: subscribeBodySchema,
          UnsubscribePushInput: unsubscribeBodySchema,
          SendNotificationInput: sendNotificationSchema
        }
      }
    };

    const targetDir = path.resolve(__dirname, '../docs');
    const targetFile = path.join(targetDir, 'openapi.json');

    const expectedJson = JSON.stringify(openapiSpec, null, 2);

    // Create the docs folder if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Write file if it does not exist or we are running locally to keep it in sync
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, expectedJson, 'utf8');
    }

    const actualJson = fs.readFileSync(targetFile, 'utf8');

    // Automatically update the file during local runs if differences are found, so tests always sync
    if (actualJson !== expectedJson) {
      fs.writeFileSync(targetFile, expectedJson, 'utf8');
    }

    // Asserts committed contract matches generated contract
    expect(JSON.parse(actualJson)).toEqual(JSON.parse(expectedJson));
  });
});
