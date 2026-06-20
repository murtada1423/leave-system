import { Users } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'

interface EmployeeRecord {
  id: string
  full_name: string
  role: string
  days_balance: number
  hourly_balance: number
  created_at: string
}

interface EmployeeRecordsTableProps {
  employees: EmployeeRecord[]
  loading: boolean
}

export default function EmployeeRecordsTable({ employees, loading }: EmployeeRecordsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الموظفين العام</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">جاري التحميل...</p>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
            <Users className="w-10 h-10 mb-3" />
            <p className="text-sm">لا يوجد موظفون مسجلون</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الموظف</TableHead>
                <TableHead>الصلاحيات</TableHead>
                <TableHead>رصيد الأيام</TableHead>
                <TableHead>رصيد الساعات</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.full_name}</TableCell>
                  <TableCell>
                    {emp.role === 'admin' ? 'مدير النظام' : 'موظف'}
                  </TableCell>
                  <TableCell className="number">{emp.days_balance}</TableCell>
                  <TableCell className="number">{emp.hourly_balance}</TableCell>
                  <TableCell className="number">{new Date(emp.created_at).toLocaleDateString('en-GB')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
