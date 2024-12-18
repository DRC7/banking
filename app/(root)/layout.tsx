// import MobileNav from "@/components/MobileNav";
// import Sidebar from "@/components/Sidebar";
// import { getLoggedInUser } from "@/lib/actions/user.actions";
// import Image from "next/image";
// import { redirect } from "next/navigation";

// export default async function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   const loggedIn = await getLoggedInUser()

//   if(!loggedIn) redirect('/sign-in')

//   return (
//     <main className="flex h-screen w-full font-inter">
//         <Sidebar user={loggedIn} />
//         <div className="flex size-full flex-col">
//           <div className="root-layout">
//             <Image src="/icons/logo.svg" width={30} height={30} alt="logo"/>
//             <div>
//               <MobileNav user={loggedIn}/>
//             </div>
//           </div>
//           {children}
//         </div>
        
//     </main>
//   );
// }

import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await getLoggedInUser();

  // Redirect if not logged in
  if (!loggedIn) redirect("/sign-in");

  return (
    <main className="flex h-screen w-full font-inter">
      {/* Conditional rendering for Sidebar */}
      {loggedIn ? (
        <Sidebar user={loggedIn} />
      ) : (
        <div>Loading...</div> // Placeholder if loggedIn is null or undefined
      )}      
      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image src="/icons/logo.svg" width={30} height={30} alt="logo" />
          
          {/* Conditional rendering for MobileNav */}
          <div>
            {loggedIn ? (
              <MobileNav user={loggedIn} />
            ) : (
              <div>Loading...</div> // Placeholder if loggedIn is null or undefined
            )}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}