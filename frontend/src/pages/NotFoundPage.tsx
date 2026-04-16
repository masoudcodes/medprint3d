import { Button, Result } from 'antd'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Page not found"
      subTitle="The page you visited does not exist."
      extra={
        <Button type="primary">
          <Link to="/">Go Home</Link>
        </Button>
      }
    />
  )
}

