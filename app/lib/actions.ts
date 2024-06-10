'use server';
import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { error } from "console";
import bcryp from "bcrypt";

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const formShema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Por favor selecciona un customer'
    }),
    amount: z.coerce
        .number()
        .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Por favor seleciona un status'
    }),
    date: z.string()
})
const formShemaUser = z.object({
    id: z.string(),
    name: z.string({
        invalid_type_error: 'Por favor Ponga un nombre de usuario'
    }),
    email: z.coerce
        .string({
            invalid_type_error: 'Por favor ponga un correo'
        }),
    password: z.string({
        invalid_type_error: 'Por favor Ponga una contraseña'
    })
})

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];

    };
    message?: string | null;
}

export type StateUser = {
    errors?: {
        name?: string[];
        email?: string[];
        password?: string[];

    };
    message?: string | null;
}



const CreateInvoice = formShema.omit({ id: true, date: true })

export async function createInvoices(prevState: State, formData: FormData) {

    const validateField = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });

    if (!validateField.success) {
        return {
            errors: validateField.error.flatten().fieldErrors,
            message: 'Error al crear factura'
        }


    }
    const { amount, customerId, status } = validateField.data;
    const amountIncentes = amount * 100;
    // Considerar esta forma cuando es un formulario con muchos campos
    const rawFormData2 = Object.fromEntries(formData.entries());

    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`INSERT INTO invoices (customer_id, amount, status, date) 
        VALUES (${customerId}, ${amountIncentes}, ${status}, ${date})`;
    } catch (error) {
        return {
            message: 'DataBase Error : failed create invoice'
        }

    }

    revalidatePath('/dashboard/facturas');
    redirect('/dashboard/facturas');


}

const UpdateInvoice = formShema.omit({ id: true, date: true })

export async function updateInvoice(id: string, prevState: State, formData: FormData) {

    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    })

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
        };
    }

    const { amount, customerId, status } = validatedFields.data

    const amountInCent = amount * 100;
    try {

        await sql`UPDATE invoices 
        SET customer_id = ${customerId}, amount = ${amountInCent}, status = ${status} 
        WHERE id = ${id}`;


    } catch (error) {
        return {
            message: 'Error DATABASE: Error update Invoice'
        }
    }

    revalidatePath('/dashboard/facturas')
    redirect('/dashboard/facturas')

}


export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

const CreateUser = formShemaUser.omit({ id: true})

export async function register(prevState: StateUser, formData: FormData) {

    const validatedFields = CreateUser.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password')
    })

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Crear Usuario.',
        };
    }

    const {email, name, password} = validatedFields.data
    console.log("🚀 ~ register ~ password:", password)
    const saltRounds = 10;
    const passwordEncript =await  bcryp.hash(password, saltRounds);
    console.log("🚀 ~ register ~ passwordEncript:", passwordEncript)

    try {
        await sql`INSERT INTO users ( name, email, password) 
        VALUES (${name}, ${email}, ${passwordEncript})`;
    } catch (error) {
        return {
            message: `${error}`
        }

    }
    revalidatePath('/dashboard/facturas');
    redirect('/dashboard/facturas');

}



export async function removeInvoice(id: string) {

    try {

        await sql`DELETE FROM invoices where id = ${id}`
        revalidatePath('/dashboard/facturas')

    } catch (error) {
        return {
            message: 'Error DATABASE: failed delete invoice'
        }
    }


}