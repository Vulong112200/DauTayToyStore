import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description:
    'Câu chuyện về DauTayToy Store — cửa hàng đồ chơi trẻ em chính hãng, an toàn và sáng tạo.',
};

export default function AboutPage() {
  return (
    <section className="container py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Về DauTayToy Store</h1>

        <div className="prose-content mt-8">
          <p>
            DauTayToy Store bắt đầu từ một trang Facebook nhỏ chuyên chọn lọc đồ chơi an toàn cho
            các bé, được nhiều phụ huynh tin tưởng nhờ sự tận tâm trong từng đơn hàng. Từ những
            đơn hàng đầu tiên gửi qua tin nhắn, chúng tôi đã phát triển thành một cửa hàng trực
            tuyến chuyên nghiệp — nhưng tinh thần phục vụ khách hàng như người thân trong gia đình
            thì vẫn không đổi.
          </p>

          <h2>Sứ mệnh của chúng tôi</h2>
          <p>
            Chúng tôi tin rằng đồ chơi không chỉ để giải trí mà còn là công cụ nuôi dưỡng trí tưởng
            tượng, khả năng tư duy và sự phát triển toàn diện của trẻ. Vì vậy, mỗi sản phẩm tại
            DauTayToy Store đều được chọn lọc kỹ càng về nguồn gốc, chất liệu và độ an toàn trước
            khi đến tay khách hàng.
          </p>

          <h2>Cam kết chất lượng</h2>
          <ul>
            <li>100% sản phẩm có nguồn gốc, xuất xứ rõ ràng.</li>
            <li>Đạt các tiêu chuẩn an toàn quốc tế (EN71, ASTM F963) cho đồ chơi trẻ em.</li>
            <li>Đổi trả trong vòng 7 ngày nếu sản phẩm còn nguyên tem mác.</li>
            <li>Hỗ trợ tư vấn chọn đồ chơi phù hợp theo độ tuổi và sở thích của bé.</li>
          </ul>

          <h2>Vì sao chọn chúng tôi?</h2>
          <p>
            Với kinh nghiệm phục vụ hàng nghìn phụ huynh, chúng tôi hiểu rằng việc chọn đồ chơi cho
            con không chỉ đơn giản là mua sắm — đó là một phần trong hành trình nuôi dạy con của
            mỗi gia đình. DauTayToy Store luôn sẵn sàng đồng hành cùng bạn trong hành trình ấy.
          </p>
        </div>
      </div>
    </section>
  );
}
