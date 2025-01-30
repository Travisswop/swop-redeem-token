import { NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
  getRedemptionPool,
  checkUserRedemption,
  recordRedemption,
} from '@/lib/db';

const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com'
);

const MAX_REDEEM_AMOUNT = 2 * 1_000_000; // 2 USDC (6 decimals)

export async function GET(
  request: Request,
  { params }: { params: { poolId: string } }
) {
  try {
    const { poolId } = params;
    const pool = await getRedemptionPool(poolId);

    // Remove sensitive data before sending to client
    const safePool = {
      ...pool,
      // temp_account_private_key: undefined,
    };

    return NextResponse.json({
      success: true,
      pool: safePool,
    });
  } catch (error: any) {
    console.error('Error fetching pool:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch pool details',
      },
      { status: 500 }
    );
  }
}

// export async function POST(
//   request: Request,
//   { params }: { params: { poolId: string } }
// ) {
//   try {
//     const { userWallet } = await request.json();
//     const { poolId } = params;

//     if (!userWallet) {
//       return NextResponse.json(
//         { success: false, message: 'User wallet is required' },
//         { status: 400 }
//       );
//     }

//     // Get pool details including the temporary account's private key
//     const pool = await getRedemptionPool(poolId);

//     if (!pool.temp_account_private_key) {
//       return NextResponse.json(
//         { success: false, message: 'Invalid redemption pool' },
//         { status: 400 }
//       );
//     }

//     // Check user's previous redemptions
//     const userRedeemed = await checkUserRedemption(
//       poolId,
//       userWallet
//     );

//     // Check if user has reached their wallet limit
//     if (userRedeemed >= pool.tokens_per_wallet) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: 'Maximum redemption limit reached for this wallet',
//         },
//         { status: 400 }
//       );
//     }

//     // Calculate remaining allowed amount for this wallet
//     const remainingForWallet = pool.tokens_per_wallet - userRedeemed;
//     const amountToRedeem = Math.min(
//       remainingForWallet,
//       pool.tokens_per_wallet
//     );

//     try {
//       // Decode the base58 private key
//       const decodedPrivateKey = bs58.decode(
//         pool.temp_account_private_key
//       );
//       const tempAccountKeypair = Keypair.fromSecretKey(
//         Uint8Array.from(decodedPrivateKey)
//       );

//       const transaction = new Transaction();

//       // Check if this is a native SOL transfer
//       const isNativeSOL =
//         pool.token_mint === SystemProgram.programId.toBase58();

//       if (isNativeSOL) {
//         // Handle SOL transfer
//         transaction.add(
//           SystemProgram.transfer({
//             fromPubkey: tempAccountKeypair.publicKey,
//             toPubkey: new PublicKey(userWallet),
//             lamports: amountToRedeem,
//           })
//         );
//       } else {
//         // Handle SPL token transfer
//         const mintPubkey = new PublicKey(pool.token_mint);
//         const userPubkey = new PublicKey(userWallet);

//         // Get the token accounts
//         const userTokenAccount = await getAssociatedTokenAddress(
//           mintPubkey,
//           userPubkey,
//           false,
//           TOKEN_PROGRAM_ID,
//           ASSOCIATED_TOKEN_PROGRAM_ID
//         );

//         const tempTokenAccount = await getAssociatedTokenAddress(
//           mintPubkey,
//           tempAccountKeypair.publicKey,
//           false,
//           TOKEN_PROGRAM_ID,
//           ASSOCIATED_TOKEN_PROGRAM_ID
//         );

//         // Check if user's token account exists, if not add creation instruction
//         const userAccountInfo =
//           await connection.getAccountInfo(userTokenAccount);
//         if (!userAccountInfo) {
//           transaction.add(
//             createAssociatedTokenAccountInstruction(
//               tempAccountKeypair.publicKey, // payer
//               userTokenAccount,
//               userPubkey,
//               mintPubkey,
//               TOKEN_PROGRAM_ID,
//               ASSOCIATED_TOKEN_PROGRAM_ID
//             )
//           );
//         }

//         // Add transfer instruction
//         transaction.add(
//           createTransferInstruction(
//             tempTokenAccount,
//             userTokenAccount,
//             tempAccountKeypair.publicKey,
//             amountToRedeem,
//             [],
//             TOKEN_PROGRAM_ID
//           )
//         );
//       }

//       // Get latest blockhash
//       const { blockhash } = await connection.getLatestBlockhash();
//       transaction.recentBlockhash = blockhash;
//       transaction.feePayer = tempAccountKeypair.publicKey;

//       // Sign the transaction with the temporary account's keypair
//       transaction.sign(tempAccountKeypair);

//       // Record redemption
//       await recordRedemption(poolId, userWallet, amountToRedeem);

//       // Return signed transaction
//       return NextResponse.json({
//         success: true,
//         signedTransaction: transaction.serialize().toString('base64'),
//       });
//     } catch (error: any) {
//       console.error('Error processing redemption:', error);
//       return NextResponse.json(
//         {
//           success: false,
//           message: 'Failed to process redemption: ' + error.message,
//         },
//         { status: 500 }
//       );
//     }
//   } catch (error: any) {
//     console.error('Error redeeming tokens:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         message: error.message || 'Failed to redeem tokens',
//       },
//       { status: 500 }
//     );
//   }
// }
