import { getAdminUser } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Workspace from '../workspace';
export const dynamic='force-dynamic';
export default async function Portal(){const user=await getAdminUser();if(!user)redirect('/');return <Workspace user={user.displayName}/>}
