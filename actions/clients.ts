"use server";
import { db } from "@/lib/db";
import { Prisma, Client, ClientStatus, LoanStatus } from "@prisma/client";

export const getClientById = async (id: string): Promise<Client | null> => {
    return await db.client.findUnique({
        where: { id },
        include: {
            loans: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    });
};

export const getClientBySearch = async (query: string): Promise<Client[]> => {
    // Validar entrada
    if (!query || query.trim() === "") return [];

    const trimmedQuery = query.trim();

    // Intentar parsear como número para búsqueda por identification
    const idNumber = parseInt(trimmedQuery);

    // Construir la consulta OR para buscar en ambos campos
    return await db.client.findMany({
        where: {
            OR: [
                // Buscar por nombre
                {
                    fullName: {
                        contains: trimmedQuery
                    }
                },
                // Buscar por identification (solo si es un número válido)
                ...(isNaN(idNumber) ? [] : [{
                    identification: {
                        equals: idNumber
                    }
                }])
            ],
            deletedAt: null, // Solo clientes no eliminados
        },
        include: {
            loans: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        },
        take: 10, // Limitar resultados
    });
};

export type ClientStatusFilter = "active" | "inactive" | "blocked" | "all";

export const getClientsByStatus = async (status: ClientStatusFilter): Promise<Client[]> => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const baseWhere: Prisma.ClientWhereInput = {
        deletedAt: null,
    };

    // Configurar los filtros según el estado
    switch (status) {
        case "active":
            baseWhere.AND = [
                { status: ClientStatus.ACTIVE },
                { isDisallowed: false },
                {
                    OR: [
                        // Clientes con préstamos activos
                        {
                            loans: {
                                some: {
                                    status: { in: [LoanStatus.ACTIVE, LoanStatus.PENDING] }
                                }
                            }
                        },
                        // Clientes sin préstamos pero activos
                        {
                            loans: { none: {} }
                        }
                    ]
                }
            ];
            break;

        case "inactive":
            baseWhere.AND = [
                { status: ClientStatus.INACTIVE },
                {
                    OR: [
                        // Sin préstamos en el último año
                        {
                            loans: {
                                every: {
                                    OR: [
                                        { createdAt: { lt: oneYearAgo } },
                                        { status: LoanStatus.COMPLETED }
                                    ]
                                }
                            }
                        },
                        // Sin préstamos
                        {
                            loans: { none: {} }
                        }
                    ]
                }
            ];
            break;

        case "blocked":
            baseWhere.OR = [
                { status: ClientStatus.BLOCKED },
                { isDisallowed: true }
            ];
            break;

        // "all" no necesita filtros adicionales
    }

    return await db.client.findMany({
        where: baseWhere,
        include: {
            loans: {
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    payments: {
                        orderBy: {
                            paymentDate: 'desc'
                        },
                        take: 1
                    }
                }
            },
            _count: {
                select: {
                    loans: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
};
