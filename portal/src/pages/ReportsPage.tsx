import { Card, List, Typography } from 'antd';

const data = [
  {
    title: 'РСБУ, декабрь 2025',
    description: 'Отчётность по дочкам за 12.2025'
  },
  {
    title: 'Управленческая отчётность, Q4 2025',
    description: 'Консолидированная отчётность по группе'
  }
];

export function ReportsPage() {
  return (
    <div className="page">
      <Typography.Title level={3}>Отчётность</Typography.Title>
      <Card>
        <List
          itemLayout="horizontal"
          dataSource={data}
          renderItem={(item) => (
            <List.Item actions={[<a key="download">Скачать</a>]}>
              <List.Item.Meta title={item.title} description={item.description} />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}

