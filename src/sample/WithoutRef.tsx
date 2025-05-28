// import React, { useState, useEffect } from 'react';
// import { FaUserFriends, FaSpinner, FaCheck, FaTimes, FaLock, FaInfoCircle } from 'react-icons/fa';
// // Define types locally to ensure they match
// enum RegistrationType {
//   Direct = 'direct',
//   Referral = 'referral'
// }

// interface RegistrationState {
//   type: RegistrationType;
//   username: string;
//   referrerUsername: string;
//   isLoading: boolean;
//   error: string | null;
//   success: boolean;
//   txHash: string | null;
// }
// import { registerWithReferral, registerWithoutReferral, checkReferrer, getAddressByUsername } from '@/utils/badgeWeb3';
// import { ethers } from 'ethers';

// interface UsernameRegistrationProps {
//   address: string;
//   signer: ethers.Signer | null;
//   onRegistrationComplete: () => void;
//   hasReferrer?: boolean; // Prop to check if user already has a referrer
// }

// const UsernameRegistration: React.FC<UsernameRegistrationProps> = ({
//   address,
//   signer,
//   onRegistrationComplete,
//   hasReferrer = false
// }) => {
//   const [username, setUsername] = useState('');
//   const [referrerUsername, setReferrerUsername] = useState('');
//   const [usernameError, setUsernameError] = useState('');
//   const [referrerError, setReferrerError] = useState('');
//   const [useReferral, setUseReferral] = useState(false);
//   const [registrationState, setRegistrationState] = useState<RegistrationState>({
//     type: RegistrationType.Direct, // Default to direct registration
//     username: '',
//     referrerUsername: '',
//     isLoading: false,
//     error: null,
//     success: false,
//     txHash: null
//   });

//   // Validate username format
//   const validateUsername = (input: string) => {
//     if (input.length < 3) {
//       return 'Username must be at least 3 characters';
//     }
//     if (input.length > 20) {
//       return 'Username must be at most 20 characters';
//     }
//     if (!/^[a-z0-9_]+$/.test(input.toLowerCase())) {
//       return 'Username can only contain letters, numbers, and underscores';
//     }
//     return '';
//   };

//   // Handle username input change
//   const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setUsername(value);
//     setUsernameError(validateUsername(value));
//   };

//   // Handle referrer input change
//   const handleReferrerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setReferrerUsername(value);
//     if (useReferral && value === '') {
//       setReferrerError('Referrer username is required when using referral');
//     } else if (value !== '') {
//       setReferrerError(validateUsername(value));
//     } else {
//       setReferrerError('');
//     }
//   };

//   // Toggle referral usage
//   const handleToggleReferral = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const checked = e.target.checked;
//     setUseReferral(checked);
    
//     // Clear any referrer errors when disabling referral
//     if (!checked) {
//       setReferrerError('');
//     } else if (referrerUsername === '') {
//       setReferrerError('Referrer username is required when using referral');
//     }
    
//     // Update registration type
//     setRegistrationState({
//       ...registrationState,
//       type: checked ? RegistrationType.Referral : RegistrationType.Direct
//     });
//   };

//   // Handle registration form submission
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!signer) {
//       setRegistrationState({
//         ...registrationState,
//         error: 'Wallet not connected'
//       });
//       return;
//     }
    
//     // Validate username
//     const usernameError = validateUsername(username);
//     if (usernameError) {
//       setUsernameError(usernameError);
//       return;
//     }
    
//     // Validate referrer if using referral
//     if (useReferral) {
//       if (!referrerUsername) {
//         setReferrerError('Referrer username is required when using referral');
//         return;
//       }
      
//       const referrerError = validateUsername(referrerUsername);
//       if (referrerError) {
//         setReferrerError(referrerError);
//         return;
//       }
      
//       // Verify referrer exists
//       try {
//         const referrerAddress = await getAddressByUsername(referrerUsername);
//         if (!referrerAddress) {
//           setReferrerError('Referrer username not found');
//           return;
//         }
//       } catch (error) {
//         setReferrerError('Error verifying referrer');
//         return;
//       }
//     }
    
//     // Start registration process
//     setRegistrationState({
//       ...registrationState,
//       username,
//       referrerUsername: useReferral ? referrerUsername : '',
//       isLoading: true,
//       error: null,
//       success: false,
//       txHash: null
//     });
    
//     try {
//       let result;
      
//       if (useReferral) {
//         // Register with referral
//         result = await registerWithReferral(signer, username, referrerUsername);
//       } else {
//         // Register without referral
//         result = await registerWithoutReferral(signer, username);
//       }
      
//       if (result.success) {
//         setRegistrationState({
//           ...registrationState,
//           isLoading: false,
//           success: true,
//           txHash: result.txHash || null
//         });
        
//         // Notify parent component of successful registration
//         setTimeout(() => {
//           onRegistrationComplete();
//         }, 2000);
//       } else {
//         setRegistrationState({
//           ...registrationState,
//           isLoading: false,
//           error: result.error || 'Registration failed'
//         });
//       }
//     } catch (error: any) {
//       setRegistrationState({
//         ...registrationState,
//         isLoading: false,
//         error: error.message || 'Registration failed'
//       });
//     }
//   };

//   return (
//     <div>
//       <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
//         Set Your Username
//       </h2>
      
//       <p className="text-gray-600 dark:text-gray-300 mb-6">
//         Choose a unique username that will identify you in the GM Tea community.
//         <br />
//         <span className="text-red-500 text-sm font-medium">
//           Note: Your username cannot be changed after registration.
//         </span>
//       </p>
      
//       {/* If user already has a referrer, show a notice */}
//       {hasReferrer && (
//         <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-md p-4 flex items-start">
//           <FaLock className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
//           <p className="text-sm text-blue-700 dark:text-blue-300">
//             You are already registered with a referral. You cannot change your referrer once set.
//           </p>
//         </div>
//       )}
      
//       {/* Optional Referral Notice */}
//       {!hasReferrer && (
//         <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-md p-4 flex items-start">
//           <FaInfoCircle className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
//           <p className="text-sm text-blue-700 dark:text-blue-300">
//             Registration with a referral is optional but recommended. If you have been invited by someone,
//             you can enter their username to receive additional benefits.
//           </p>
//         </div>
//       )}
      
//       {/* Registration Form */}
//       {!hasReferrer && (
//         <form onSubmit={handleSubmit}>
//           {/* Username Input */}
//           <div className="mb-4">
//             <label 
//               htmlFor="username" 
//               className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//             >
//               Username
//             </label>
//             <input
//               type="text"
//               id="username"
//               className={`w-full px-4 py-2 rounded-md border ${
//                 usernameError
//                   ? 'border-red-300 dark:border-red-500'
//                   : 'border-gray-300 dark:border-gray-600'
//               } bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
//               placeholder="Choose a username"
//               value={username}
//               onChange={handleUsernameChange}
//               disabled={registrationState.isLoading}
//               required
//             />
//             {usernameError && (
//               <p className="mt-1 text-sm text-red-600 dark:text-red-400">
//                 {usernameError}
//               </p>
//             )}
//           </div>
          
//           {/* Referral Toggle */}
//           <div className="mb-4">
//             <div className="flex items-center">
//               <input
//                 type="checkbox"
//                 id="useReferral"
//                 checked={useReferral}
//                 onChange={handleToggleReferral}
//                 disabled={registrationState.isLoading}
//                 className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
//               />
//               <label 
//                 htmlFor="useReferral" 
//                 className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Register with a referral (optional)
//               </label>
//             </div>
//           </div>
          
//           {/* Referrer Input - Only shown when referral is toggled on */}
//           {useReferral && (
//             <div className="mb-4">
//               <label 
//                 htmlFor="referrer" 
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//               >
//                 Referrer's Username
//               </label>
//               <input
//                 type="text"
//                 id="referrer"
//                 className={`w-full px-4 py-2 rounded-md border ${
//                   referrerError
//                     ? 'border-red-300 dark:border-red-500'
//                     : 'border-gray-300 dark:border-gray-600'
//                 } bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
//                 placeholder="Enter referrer's username"
//                 value={referrerUsername}
//                 onChange={handleReferrerChange}
//                 disabled={registrationState.isLoading}
//                 required={useReferral}
//               />
//               {referrerError && (
//                 <p className="mt-1 text-sm text-red-600 dark:text-red-400">
//                   {referrerError}
//                 </p>
//               )}
//             </div>
//           )}
          
//           {/* Submit Button */}
//           <button
//             type="submit"
//             disabled={registrationState.isLoading || registrationState.success}
//             className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
//               registrationState.isLoading || registrationState.success
//                 ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
//                 : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white'
//             }`}
//           >
//             {registrationState.isLoading ? (
//               <span className="flex items-center justify-center">
//                 <FaSpinner className="animate-spin mr-2" />
//                 Registering...
//               </span>
//             ) : registrationState.success ? (
//               <span className="flex items-center justify-center">
//                 <FaCheck className="mr-2" />
//                 Registration Successful
//               </span>
//             ) : (
//               useReferral ? 'Register with Referral' : 'Register'
//             )}
//           </button>
          
//           {/* Error Message */}
//           {registrationState.error && (
//             <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md">
//               <div className="flex items-center">
//                 <FaTimes className="mr-2 flex-shrink-0" />
//                 <p>{registrationState.error}</p>
//               </div>
//             </div>
//           )}
          
//           {/* Success Message */}
//           {registrationState.success && (
//             <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md">
//               <div className="flex items-center">
//                 <FaCheck className="mr-2 flex-shrink-0" />
//                 <div>
//                   <p>Registration successful!</p>
//                   {registrationState.txHash && (
//                     <a
//                       href={`https://sepolia.tea.xyz/tx/${registrationState.txHash}`}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="text-emerald-600 dark:text-emerald-400 underline text-sm"
//                     >
//                       View transaction
//                     </a>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}
//         </form>
//       )}
      
//       {/* Information Box */}
//       <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
//         <h3 className="text-blue-800 dark:text-blue-300 font-medium mb-2">
//           About Registration
//         </h3>
//         <p className="text-blue-700 dark:text-blue-300 text-sm">
//           You can register with or without a referral. Using a referral provides benefits - 
//           the referrer will receive rewards when you mint badges, and you'll enjoy benefits from joining 
//           through their invitation. Remember, your username and referrer cannot be changed once set.
//         </p>
//       </div>
//     </div>
//   );
// };

// export default UsernameRegistration;