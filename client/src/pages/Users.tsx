import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconIdBadge, IconPlus, IconSearch, IconEdit, IconShield } from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { User } from '../types';

const roleClass: Record<string, string> = {
admin: 'pill pill-red',
technician: 'pill pill-blue',
accountant: 'pill pill-green',
viewer: 'pill pill-gray',
};

export default function Users() {
const [users, setUsers] = useState<User[]>([]);
const [search, setSearch] = useState('');
const [loading, setLoading] = useState(true);

useEffect(() => {
setLoading(true);
api.get('/users', { params: { search } })
.then(r => {
const raw = r.data.data ?? r.data ?? [];
const mapped = (raw as any[]).map(u => ({
id: u.user_id ?? u.id,
name: u.full_name ?? u.name,
email: u.email,
role: u.role,
}));
setUsers(mapped);
})
.catch(() => setUsers([]))
.finally(() => setLoading(false));
}, [search]);

return (
<div>
<PageBanner
icon={<IconIdBadge size={28} />}
title="Users"
subtitle="Manage system users and access roles"
backLabel="Back"
backPath="/"
action={
<Link to="/users/new"
className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg"
>
<IconPlus size={15} /> Add User
</Link>
}
/>

<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
<div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
<p className="text-[13px] text-gray-500">{users.length} system users</p>
<div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-[240px]">
<IconSearch size={14} className="text-gray-400 flex-shrink-0" />
<input type="text" placeholder="Search user, email..."
value={search} onChange={e => setSearch(e.target.value)}
className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
</div>
</div>

<div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
<table className="erp-table">
<thead>
<tr>
<th>#</th>
<th>Name</th>
<th>Email</th>
<th>Role</th>
<th className="text-center">Actions</th>
</tr>
</thead>
<tbody>
{loading ? (
<tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
) : users.length === 0 ? (
<tr><td colSpan={5} className="text-center py-10 text-gray-400">No users found</td></tr>
) : (
users.map((u, i) => (
<tr key={u.id}>
<td className="text-gray-400 text-[12px]">{i + 1}</td>
<td className="font-medium text-[13px] flex items-center gap-2">
<div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[11px] font-bold flex-shrink-0">
{u.name.charAt(0).toUpperCase()}
</div>
{u.name}
</td>
<td className="text-[12px] text-gray-500">{u.email}</td>
<td>
<span className={`${roleClass[u.role] ?? 'pill pill-gray'} flex items-center gap-1 w-fit`}>
<IconShield size={11} />{u.role}
</span>
</td>
<td>
<div className="flex items-center justify-center">
<Link to={"/users/" + u.id + "/edit"}
className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
>
<IconEdit size={14} />
</Link>
</div>
</td>
</tr>
))
)}
</tbody>
</table>
</div>
</div>
</div>
);
}
