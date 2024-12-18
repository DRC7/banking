'use server';

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "../plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
    APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const signIn = async ({ email, password }: signInProps) => {
    try {
        const { account } = await createAdminClient();
        const response = await account.createEmailPasswordSession(email, password);

        cookies().set("appwrite-session", response.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        return parseStringify(response);
    } catch (error) {
        console.error("Error during sign-in:", error);
        return null;
    }
};

export const signUp = async ({ password, ...userData}: SignUpParams) => {
    const { email, firstName, lastName } = userData;

    try {
        const { account, database } = await createAdminClient();
        const newUserAccount = await account.create(
            ID.unique(),
            email,
            password,
            `${firstName} ${lastName}`
        );

        if (!newUserAccount) throw new Error("Error creating user account");

        const dwollaCustomerUrl = await createDwollaCustomer({
            ...userData,
            type: "personal",
        });

        if (!dwollaCustomerUrl) throw new Error("Error creating Dwolla customer");

        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

        await database.createDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            ID.unique(),
            {
                ...userData,
                userId: newUserAccount.$id,
                dwollaCustomerId,
                dwollaCustomerUrl,
            }
        );

        const session = await account.createEmailPasswordSession(email, password);

        cookies().set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        return parseStringify(newUserAccount);
    } catch (error) {
        console.error("Error during sign-up:", error);
        return null;
    }
};

export async function getLoggedInUser() {
    try {
        const { account } = await createSessionClient();
        const user = await account.get();

        if (!user || !user.$id) {
            console.error("No valid user found in session.");
            return null;
        }

        return user;
    } catch (error) {
        console.error("Error retrieving logged-in user:", error);
        return null;
    }
}

export const logoutAccount = async () => {
    try {
        const { account } = await createSessionClient();
        cookies().delete("appwrite-session");
        await account.deleteSession("current");
    } catch (error) {
        console.error("Error during logout:", error);
    }
};

export const createLinkToken = async (user: User | null) => {
    if (!user || !user.$id) {
        console.error("Invalid user provided for creating a link token.");
        return null;
    }

    try {
        const tokenParams = {
            user: {
                client_user_id: user.$id,
            },
            client_name: `${user.firstName} ${user.lastName}`,
            products: ["auth"] as Products[],
            language: "en",
            country_codes: ["US"] as CountryCode[],
        };

        const response = await plaidClient.linkTokenCreate(tokenParams);
        return parseStringify({ linkToken: response.data.link_token });
    } catch (error) {
        console.error("Error creating link token:", error);
        return null;
    }
};

export const createBankAccount = async ({
    userId,
    bankId,
    accountId,
    accessToken,
    fundingSourceUrl,
    sharableId,
}: createBankAccountProps) => {
    try {
        const { database } = await createAdminClient();

        const bankAccount = await database.createDocument(
            DATABASE_ID!,
            BANK_COLLECTION_ID!,
            ID.unique(),
            {
                userId,
                bankId,
                accountId,
                accessToken,
                fundingSourceUrl,
                sharableId,
            }
        );

        return parseStringify(bankAccount);
    } catch (error) {
        console.error("Error creating bank account:", error);
        return null;
    }
};

export const exchangePublicToken = async ({
    publicToken,
    user,
}: exchangePublicTokenProps) => {
    if (!user || !user.$id) {
        console.error("Invalid user provided for exchanging a public token.");
        return null;
    }

    try {
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: publicToken,
        });

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        const accountsResponse = await plaidClient.accountsGet({
            access_token: accessToken,
        });

        const accountData = accountsResponse.data.accounts[0];

        const request: ProcessorTokenCreateRequest = {
            access_token: accessToken,
            account_id: accountData.account_id,
            processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
        };

        const processorTokenResponse = await plaidClient.processorTokenCreate(request);
        const processorToken = processorTokenResponse.data.processor_token;

        const fundingSourceUrl = await addFundingSource({
            dwollaCustomerId: user.dwollaCustomerId,
            processorToken,
            bankName: accountData.name,
        });

        if (!fundingSourceUrl) throw new Error("Funding source URL creation failed");

        await createBankAccount({
            userId: user.$id,
            bankId: itemId,
            accountId: accountData.account_id,
            accessToken,
            fundingSourceUrl,
            sharableId: encryptId(accountData.account_id),
        });

        revalidatePath("/");

        return parseStringify({ publicTokenExchange: "complete" });
    } catch (error) {
        console.error("Error exchanging public token:", error);
        return null;
    }
};


// 'use server';

// import { ID } from "node-appwrite";
// import { createAdminClient, createSessionClient } from "../appwrite";
// import { cookies } from "next/headers";
// import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
// import { Trykker } from "next/font/google";
// import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
// import { plaidClient } from "../plaid";
// import { revalidatePath } from "next/cache";
// import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

// const {
//     APPWRITE_DATABASE_ID: DATABASE_ID,
//     APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
//     APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
// } = process.env

// export const signIn = async ({ email, password }: signInProps) => {
//     try {
//         // Mutation / Database / Make fetch
//         const { account } = await createAdminClient();

//         const response = await account.createEmailPasswordSession(email, password);

//          // Set session cookie for future requests
//         cookies().set("appwrite-session", response.secret, {
//             path: "/",
//             httpOnly: true,
//             sameSite: "strict",
//             secure: true,
//         });

//         return parseStringify(response)

//     } catch (error) {
//         console.error('Error', error)
//     }
// }

// export const signUp = async (userData: SignUpParams) => {
//     //Destructoring the data here
//     const { email, password, firstName, lastName } = userData;

//     let newUserAccount

//     try {
//         // Create User Account
//         // Mutation / Database / Make fetch
//         const { account, database } = await createAdminClient();

//         newUserAccount = await account.create(
//             ID.unique(), 
//             email, 
//             password, 
//             `${firstName} ${lastName}`
//         );

//         if(!newUserAccount) throw new Error('Error creating user')

//         const dwollaCustomerUrl = await createDwollaCustomer({
//             ...userData,
//             type: 'personal'
//         })

//         if(!dwollaCustomerUrl) throw new Error('Error creating Dwolla customer')

//         const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

//         const newUser = await database.createDocument(
//             DATABASE_ID!,
//             USER_COLLECTION_ID!,
//             ID.unique(),
//             {
//                 ...userData,
//                 userId: newUserAccount.$id,
//                 dwollaCustomerId,
//                 dwollaCustomerUrl
//             }
//         )

//         const session = await account.createEmailPasswordSession(email, password);

//         cookies().set("appwrite-session", session.secret, {
//         path: "/",
//         httpOnly: true,
//         sameSite: "strict",
//         secure: true,
//         });

//         return parseStringify(newUserAccount);
//     } catch (error) {
//         console.error('Error', error)
//     }
// }

// // export async function getLoggedInUser() {
// //     try {
// //       const { account } = await createSessionClient();
      
// //       const user = await account.get();

// //       return parseStringify(user);
// //     } catch (error) {
// //       return null;
// //     }
// // }

// export async function getLoggedInUser() {
//     try {
//         const { account } = await createSessionClient();
//         const user = await account.get();
        
//         if (!user) {
//             console.error("No user found in session.");
//         }

//         return user;
//     } catch (error) {
//         console.error("Error retrieving logged-in user:", error);
//         return null;
//     }
// }


// export const logoutAccount = async () => {
//     try {
//         const { account } = await createSessionClient();

//         cookies().delete('appwrite-session');

//         await account.deleteSession('current');
        
//     } catch (error) {
//         return null
//     }
// }

// export const createLinkToken = async (user: User) => {
//     try {
//         const tokenParams = {
//             user: {
//                 client_user_id: user.$id
//             },
//             client_name: user.name,
//             products: ['auth'] as Products[],
//             language: 'en',
//             country_codes: ['US'] as CountryCode[],
//         }

//         const response = await plaidClient.linkTokenCreate(tokenParams);

//         return parseStringify({ linkToken: response.data.link_token})
//     } catch (error) {
//         console.log(error)
//     }
// }

// export const createBankAccount = async ({
//     userId,
//     bankId,
//     accountId,
//     accessToken,
//     fundingSourceUrl,
//     sharableId,
// }: createBankAccountProps) => {
//     try {
//         const { database } = await createAdminClient();

//         const bankAccount = await database.createDocument(
//             DATABASE_ID!,
//             BANK_COLLECTION_ID!,
//             ID.unique(),
//             {
//                 userId,
//                 bankId,
//                 accountId,
//                 accessToken,
//                 fundingSourceUrl,
//                 sharableId,
//             }
//         )

//         return parseStringify(bankAccount)
//     } catch(error) {

//     }
// }

// export const exchangePublicToken = async ({
//     publicToken,
//     user,
// }: exchangePublicTokenProps) => {
//     try {
//         // Exchange public token for access token and item ID
//         const response = await plaidClient.itemPublicTokenExchange({
//             public_token: publicToken,
//         });

//         const accessToken = response.data.access_token;
//         const itemId = response.data.item_id;

//         // Get account information from Plaid using the access token
//         const accountsResponse = await plaidClient.accountsGet({
//             access_token: accessToken,

//         })

//         const accountData = accountsResponse.data.accounts[0];

//         // Create a processor token for Dwolla using the access token and account ID
//         const request: ProcessorTokenCreateRequest = {
//             access_token: accessToken,
//             account_id: accountData.account_id,
//             processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
//         };

//         const processorTokenResponse = await plaidClient.processorTokenCreate(request);
//         const processorToken = processorTokenResponse.data.processor_token;

//         // Create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
//         const fundingSourceUrl = await addFundingSource({
//             dwollaCustomerId: user.dwollaCustomerId,
//             processorToken,
//             bankName: accountData.name,
//         })

//         // If the funding source URl is not created, throw an error
//         if(!fundingSourceUrl) throw Error;

//         // Create a bank account using the user ID, item ID, account ID, access token, funding source URL, and sharable ID
//         await createBankAccount({
//             userId: user.$id,
//             bankId: itemId,
//             accountId: accountData.account_id,
//             accessToken,
//             fundingSourceUrl,
//             sharableId: encryptId(accountData.account_id),

//         })

//         // Revalidate the path to reflect the changes
//         revalidatePath("/")

//         //Return a success message
//         return parseStringify({
//             publicTokenExchange: "complete",
//         })
        
//     } catch (error) {
//         console.error("An error has occured while creating exchanging token:", error)
//     }
// }
