import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { apiPath } from '../utils';

import type { AuthResponse, RegisterRequest, User } from '@/lib/api/types';

export const authHandlers = [
    http.post(apiPath('/auth/register'), async ({ request }) => {
        const payload = (await request.json()) as RegisterRequest;

        if (!payload.email || !payload.password || !payload.name) {
            return HttpResponse.json(
                {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid registration data',
                    },
                },
                { status: 400 },
            );
        }

        const user: User = {
            id: faker.string.uuid(),
            name: payload.name,
            email: payload.email,
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const response: AuthResponse = {
            user,
            accessToken: faker.string.alphanumeric(40),
        };

        return HttpResponse.json({ data: response }, { status: 201 });
    }),

    http.post(apiPath('/auth/login'), async ({ request }) => {
        // Basic login mock
        const user: User = {
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            emailVerified: true,
            createdAt: new Date().toISOString(),
        };

        const response: AuthResponse = {
            user,
            accessToken: faker.string.alphanumeric(40),
        };

        return HttpResponse.json({ data: response });
    }),
];
