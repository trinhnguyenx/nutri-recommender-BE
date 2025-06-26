export const calorieSummaryMessage = `

Dựa vào dữ liệu trên, hãy viết một phản hồi cho tôi theo cấu trúc sau:
1.  **Nhận xét chung:**
    *   So sánh lượng calo tiêu thụ trung bình hàng ngày với lượng calo mục tiêu.
    *   Đánh giá mức độ tuân thủ kế hoạch của tôi.
    *   Chỉ ra những ngày tôi làm tốt và những ngày có thể cần cải thiện.
2.  **Lời khuyên & Động viên:**
    *   Nếu tôi làm tốt: Khen ngợi và khuyến khích tôi tiếp tục duy trì. Đưa ra một vài mẹo nhỏ để tối ưu hơn nữa.
    *   Nếu tôi chưa đạt mục tiêu: Đừng chỉ trích. Thay vào đó, hãy đưa ra những gợi ý cụ thể và dễ thực hiện. Ví dụ: "Tôi thấy một vài ngày bạn đã tiêu thụ hơi nhiều calo hơn mục tiêu. Có lẽ bạn có thể thử thay thế bữa ăn nhẹ X bằng Y vào lần tới?" hoặc "Để đạt được mục tiêu goal, việc duy trì lượng calo gần với targetCalories là rất quan trọng. Hãy thử chuẩn bị trước bữa ăn để kiểm soát tốt hơn nhé."
    *   Cung cấp thêm 1-2 lời khuyên chung về dinh dưỡng hoặc lối sống phù hợp với mục tiêu của tôi (ví dụ: uống đủ nước, ngủ đủ giấc, tầm quan trọng của protein khi tăng cân...).
3.  **Kết luận:** Một câu kết thúc tích cực và động viên.

**Giọng văn:** Thân thiện, tích cực, chuyên nghiệp và dễ hiểu. Sử dụng "bạn" và "tôi" để tạo cảm giác cá nhân hóa.
trả về dạng json
**title**: "Nhận xét và lời khuyên về lượng calo tiêu thụ hàng ngày của bạn"
`;

export const caloriesSummaryPrompt = `Bạn là một chuyên gia dinh dưỡng và huấn luyện viên sức khỏe AI. Nhiệm vụ của bạn là phân tích dữ liệu calo hàng ngày của người dùng và đưa ra những nhận xét, lời khuyên thân thiện, chi tiết và mang tính xây dựng để giúp họ đạt được mục tiêu.

Ngữ cảnh:
Người dùng đang theo một kế hoạch ăn uống được cá nhân hóa. Họ muốn biết họ đang thực hiện kế hoạch đó tốt như thế nào.

Hãy phân tích dữ liệu calo của người dùng và đưa ra nhận xét.

**Định dạng đầu ra mong muốn là một đối tượng JSON với hai khóa: "title" (một chuỗi ngắn gọn, hấp dẫn) và "reply" (một chuỗi chứa nội dung phản hồi chi tiết).**
`




export const promptuserAddingredients = `Bạn là một trợ lý chuyên về thực phẩm và dinh dưỡng.
### Yêu cầu:

Khi người dùng nhập yêu cầu thêm món ăn với tên món ăn được cung cấp hay nguyên liệu, bạn cần:

1. Nếu người dùng nhập vào tên món ăn thì **Kiểm tra** xem món ăn đó đã có trong dish_data hay chưa, bằng cách so sánh gần đúng với tên các món ăn đã có (khoảng **80% độ tương đồng**).  
   - Nếu món ăn đã có, hãy trả về:
   - Nếu người dùng nhập cả tên món ăn và nguyên liệu thì điều chỉnh nguyên liệu cho phù hợp với món ăn đã có. nhưng hãy chắc chắn nguyên liệu đó chưa có trong dish_data.
     
json
     {
       "status": "exist",
       "matched_dish_name": ""
       "matched_ingredients": ""
     }


2. **Nếu chưa có**, hãy tạo ra **một object JSON** với đầy đủ thông tin của món ăn theo định dạng chuẩn sau:
- không được để null thành phần dinh dưỡng của món ăn, hãy tự tính toán dựa trên nguyên liệu được cho data ở dưới **ingrendients_data** và định lượng cho chính xác, nếu nguyên liệu nào chưa có hãy reserch và đưa ra chất dinh dưỡng chính xác, sau đó hãy tự update món ăn mới từ món ăn và nguyên liệu bạn đã tạo vào data của mình
json
{
  "status": "new",
  "name": "Tên món ăn người dùng nhập",
  "calories": (tự tính tổng từ nguyên liệu và định lượng ),
  "protein": (tự tính tổng từ nguyên liệu và định lượng),
  "fat": (tự tính tổng từ nguyên liệu và định lượng),
  "carbs": (tự tính tổng từ nguyên liệu và định lượng),
  "ingredients": "liệt kê nguyên liệu kèm khối lượng ước tính cho 1 người lớn",
  "meal_type": "(chọn 1 trong: boil|xvegetable|lvegetable|salty|soup|main|dessert|snack|breakfast)",
  "suitable": "(chọn: gain|loss|any)",
  "is_favourite": true

Bạn được cung cấp một cơ sở dữ liệu các món ăn json gồm tên món ăn và nguyên liệu dưới đây:
**dish_data**
[
  {
    "name": "Canh rau ngót nấu thịt băm",
    "ingredients": "Rau ngót (150g), Thịt heo xay (50g), Hành tím (10g), Dầu ăn (10ml), Nước mắm (10ml), Tiêu (2g)"
  },
  {
    "name": "Thịt kho tiêu",
    "ingredients": "Thịt ba chỉ heo (150g), Trứng vịt (60g), Nước dừa (50ml), Nước mắm (10ml), Đường (5g), Hành tím (10g)"
  },
  {
    "name": "Rau xuống xào tỏi",
    "ingredients": "Rau muống (150g), Tỏi băm (5g), Dầu ăn (10ml), Nước mắm (10ml), Muối(2g), Đường(2g)"
  },
  {
    "name": "Chè sen đậu xanh",
    "ingredients": "Hạt sen (50g), Đậu xanh bóc vỏ (50g), Đường phèn (15g), Nước (250ml)"
  },
  {
    "name": "Gà kho gừng",
    "ingredients": "Thịt đùi gà (150g), Gừng (10g), Nước mắm (10ml), Dầu ăn (10ml), Hành tím (10g), Tiêu (2g)"
  },
  {
    "name": "Canh bí đỏ nấu tôm",
    "ingredients": "Bí đỏ (150g), Tôm (50g), Hành tím (5g), Nước mắm (10ml), Dầu ăn (5ml), Hành lá (5g)"
  },
  {
    "name": "Đậu hũ chiên sả ớt",
    "ingredients": "Đậu hũ trắng (200g), Sả băm (10g), ớt băm(5g), Dầu ăn(10ml), Nước mắm(10ml), Đường (2g)"
  },
  {
    "name": "Canh chua cá lóc",
    "ingredients": "Cá lóc (làm sạch và cắt khúc) - 200g, Cà chua(50g), Thơm (40g), Giá đỗ (30g), Đậu bắp(30g), Dọc mùng(30g), Me chua(10g), Hành lá - ngò gai (5g),Nước mắm - Muối - Đường - dầu ăn (5g)"
  },
  {
    "name": "Cá kho tộ",
    "ingredients": "Cá lóc (250g), Nước mắm (10ml), Đường (5g), Tiêu (2g), Nước màu, Hành tím (5g), Dầu ăn (10ml)"
  },
  {
    "name": "Giá hẹ xào đậu hũ",
    "ingredients": "Đậu hũ trắng (200g), Giá đỗ (100g), Hẹ (50g), Dầu ăn (5ml), Muối (5g), Nước mắm (5ml), Tiêu (3g)"
  },
  {
    "name": "Bánh flan",
    "ingredients": "1 quả trứng gà, 100ml sữa tươi, 15g đường, Vani"
  },
  {
    "name": "Canh cải nấu thịt",
    "ingredients": "Thịt heo nạc băm (100g), Rau cải xanh (100g), Hành tím băm (5g), Dầu ăn (10ml), Muối (5g), Nước mắm (10ml), Tiêu (3g), Nước lọc (300ml)"
  },
  {
    "name": "Cà tím nưỡng mỡ hành",
    "ingredients": "Cà tím (150g), Hành lá (10g), Hành tím băm (5g), Dầu ăn (10g), Muối (2g), Nước mắm (5ml), Đường (3g)"
  },
  {
    "name": "Canh rau dền nấu tôm",
    "ingredients": "Tôm tươi bóc vỏ (60g), Rau dền (100g), Hành tím băm (5g), Dầu ăn (5g), Muối (2g), Nước mắm (5ml), Tiêu (1g), Nước lọc (300ml)"
  },
  {
    "name": "Sườn xào chua ngọt",
    "ingredients": "Sườn non (200g), Cà chua (30g), Hành tím băm (5g), Tỏi băm (5g), Nước mắm (10ml), Giấm (5ml), Đường (7g), Nước tương (5ml), Dầu ăn (7g), Tiêu (2g)"
  },
  {
    "name": "Dưa cải muối xào tóp mỡ",
    "ingredients": "Dưa cải muối (100g), Tóp mỡ (40g), Tỏi băm (5g), Đường (3g), Nước mắm (5ml), Tiêu (1g)"
  },
  {
    "name": "Lẩu gà lá giang",
    "ingredients": "Thịt gà (150g), Lá giang (30g), Cà chua (30g), Hành tím băm (5g), Tỏi băm (5g), Dầu ăn (5g), Nước mắm (10ml), Đường (3g), Muối (2g), Tiêu (1g), Nước lọc (350ml)"
  },
  {
    "name": "Mực xào sa tế",
    "ingredients": "Mực tươi (150g), Hành tây (30g), Hành tím băm (5g), Tỏi băm (5g), Sa tế (10g), Nước mắm (5ml), Đường (3g), Dầu ăn (5g), Tiêu (2g)"
  },
  {
    "name": "Đậu bắp luộc & nước chấm",
    "ingredients": "Đậu bắp (100g), Nước mắm (5ml), Đường (2g), Tỏi băm (3g), Ớt băm (2g), Nước cốt chanh (5ml)"
  },
  {
    "name": "Bò lúc lắc",
    "ingredients": "Thịt bò (150g), Hành tây (40g), Tỏi băm (5g), Nước mắm (10ml), Đường (5g), Tiêu (1g), Dầu ăn (7g), Nước tương (5ml)"
  },
  {
    "name": "Canh rong biển thịt bò",
    "ingredients": "Thịt bò (80g), Rong biển khô (5g), Hành tím băm (5g), Tỏi băm (3g), Dầu ăn (5g), Nước mắm (5ml), Muối (2g), Tiêu (1g), Nước lọc (300ml)"
  },
  {
    "name": "Salad bơ trứng gà",
    "ingredients": "Bơ (70g), Trứng gà luộc (50g), Xà lách (30g), Cà chua (20g), Dầu ô liu (10g), Nước cốt chanh (5ml), Muối (2g), Tiêu (1g), Mật ong (5g)"
  },
  {
    "name": "Tôm rim salty",
    "ingredients": "Tôm tươi (120g), Nước mắm (10ml), Đường (5g), Tỏi băm (5g), Hành tím băm (5g), Tiêu (1g), Dầu ăn (5g), Nước lọc (20ml)"
  },
  {
    "name": "Canh xương bí đỏ",
    "ingredients": "Xương heo (150g), Bí đỏ (100g), Hành tím băm (5g), Tỏi băm (3g), Nước mắm (10ml), Muối (2g), Tiêu (1g), Nước lọc (300ml)"
  },
  {
    "name": "Đẫu hủ chiên mắm hành",
    "ingredients": "Đậu hủ non (150g), Mắm nêm (10ml), Hành lá (20g), Tỏi băm (5g), Dầu ăn (10g), Đường (3g), Ớt tươi (5g)"
  },
  {
    "name": "Cơm trắng",
    "ingredients": "Cơm trắng (120g)"
  },
  {
    "name": "Cơm trắng",
    "ingredients": "Cơm trắng (220g)"
  },
  {
    "name": "Canh cá khoai nấu chua",
    "ingredients": "Cá khoai (150g), Me chua (20g), Cà chua (30g), Hành tím băm (5g), Tỏi băm (5g), Ớt tươi (5g), Nước mắm (10ml), Đường (5g), Muối (2g), Rau ngổ (10g), Nước lọc (300ml)"
  },
  {
    "name": "Dạ dày xào dưa chua",
    "ingredients": "Dạ dày heo (150g), Dưa chua (70g), Tỏi băm (5g), Ớt băm (3g), Hành lá (10g), Nước mắm (10ml), Đường (3g), Dầu ăn (7g), Tiêu (1g)"
  },
  {
    "name": "Cá lóc kho tiêu",
    "ingredients": "Cá lóc (150g), Nước mắm (15ml), Đường (7g), Tiêu (3g), Hành tím băm (10g), Tỏi băm (5g), Dầu ăn (10g), Nước màu (5ml)"
  },
  {
    "name": "Cá basa kho dứa",
    "ingredients": "Cá basa (150g), Dứa (50g), Nước mắm (15ml), Đường (7g), Tỏi băm (5g), Hành tím băm (10g), Tiêu (2g), Dầu ăn (10g), Nước màu (5ml)"
  },
  {
    "name": "Su hào xào thịt bò",
    "ingredients": "Thịt bò (150g), Su hào (100g), Tỏi băm (5g), Hành tím băm (5g), Dầu ăn (10g), Nước mắm (10ml), Đường (3g), Tiêu (1g)"
  },
  {
    "name": "Trứng chiên thịt bằm",
    "ingredients": "Trứng gà (100g), Thịt heo bằm (50g), Hành tím băm (5g), Dầu ăn (10g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Thịt kho trứng",
    "ingredients": "Thịt ba chỉ heo (150g), Trứng vịt (1 quả ~60g), Nước dừa (50ml), Nước mắm (10ml), Đường (5g), Hành tím (5g)"
  },
  {
    "name": "Thịt bò xào hành tây",
    "ingredients": "Thịt bò (120g), Hành tây (60g), Tỏi băm (5g), Dầu ăn (10g), Nước mắm (10ml), Đường (3g), Tiêu (1g)"
  },
  {
    "name": "Thịt bò xào  sả",
    "ingredients": "Thịt bò (150g), Sả băm (15g), Tỏi băm (5g), Dầu ăn (10g), Nước mắm (10ml), Đường (3g), Tiêu (1g)"
  },
  {
    "name": "Khổ qua xào trứng",
    "ingredients": "Khổ qua (120g), Trứng gà (100g), Hành tím băm (5g), Dầu ăn (10g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Đậu cô ve xào thịt heo",
    "ingredients": "Thịt heo (150g), Đậu cô ve (100g), Tỏi băm (5g), Hành tím băm (5g), Dầu ăn (10g), Nước mắm (10ml), Đường (3g), Tiêu (2g)"
  },
  {
    "name": "Mướp xào lòng gà",
    "ingredients": "Lòng gà (100g), Mướp (100g), Tỏi băm (5g), Hành tím băm (5g), Dầu ăn (10g), Nước mắm (10ml), Đường (3g), Tiêu (2g)"
  },
  {
    "name": "Canh bí đỏ thịt bằm",
    "ingredients": "Bí đỏ (150g), Thịt heo xay (50g), Hành tím (5g), Nước mắm (5ml), Dầu ăn (3ml), Hành lá (5g)"
  },
  {
    "name": "Bắp cải xào thịt heo",
    "ingredients": "Thịt heo (150g), Bắp cải (100g), Tỏi băm (5g), Hành tím băm (5g), Dầu ăn (10g), Nước mắm (10ml), Đường (3g), Tiêu (2g)"
  },
  {
    "name": "Canh rau ngót thịt băm",
    "ingredients": "Rau ngót (150g), Thịt heo xay (50g), Hành tím (5g), Dầu ăn (5ml), Nước mắm (5ml), Tiêu (2g)"
  },
  {
    "name": "Canh cà chua trứng",
    "ingredients": "Cà chua (100g), Trứng gà (50g), Hành lá (10g), Dầu ăn (5g), Muối (2g), Đường (2g), Nước mắm (5ml), Tiêu (1g)"
  },
  {
    "name": "Canh bầu nấu tôm khô",
    "ingredients": "Bầu (150g), Tôm khô (30g), Hành lá (10g), Tỏi băm (5g), Dầu ăn (5g), Muối (2g), Đường (2g), Nước mắm (5ml), Tiêu (2g)"
  },
  {
    "name": "Thịt rang cháy cạnh",
    "ingredients": "Thịt heo ba chỉ (150g), Tỏi băm (5g), Hành tím băm (5g), Dầu ăn (10g), Nước mắm (10ml), Đường (5g), Tiêu (2g)"
  },
  {
    "name": "Canh xương hầm khoai",
    "ingredients": "Xương heo (150g), Khoai tây (100g), Hành lá (10g), Muối (3g), Tiêu (2g), Nước (500ml)"
  },
  {
    "name": "Rau bí xào tỏi",
    "ingredients": "Rau bí (150g), Tỏi băm (5g), Dầu ăn (10g), Muối (2g)"
  },
  {
    "name": "Tôm hấp nước dừa",
    "ingredients": "Tôm tươi (150g), Nước dừa (100ml), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Canh xương hầm măng khô",
    "ingredients": "Xương heo (150g), Măng khô (50g), Hành lá (10g), Muối (3g), Tiêu (1g), Nước (500ml)"
  },
  {
    "name": "Cá rô phi tẩm bột chiên",
    "ingredients": "Cá rô phi (150g), Bột chiên giòn (40g), Dầu ăn (20g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Cá trắm kho giềng",
    "ingredients": "Cá trắm (150g), Giềng băm (15g), Nước mắm (15ml), Đường (5g), Tiêu (2g), Hành tím băm (5g), Dầu ăn (10g)"
  },
  {
    "name": "cháo yến mạch trứng gà",
    "ingredients": "Yến mạch (40g), Trứng gà (50g), Nước (300ml), Hành lá (10g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "gỏi cuốn tôm thịt",
    "ingredients": "Bánh tráng (30g), Tôm luộc (50g), Thịt heo luộc (50g), Rau xà lách (20g), Cà rốt (20g), Húng quế (10g), Nước mắm chấm (15ml), Đậu phộng rang (5g)"
  },
  {
    "name": "Xôi đậu đen",
    "ingredients": "Gạo nếp (100g), Đậu xanh (30g), Hành phi (5g), Muối mè (5g)"
  },
  {
    "name": "bánh cuốn ",
    "ingredients": "Bột gạo (100g), Thịt băm (50g), Mộc nhĩ (10g), Hành tím băm (5g), Dầu ăn (5g), Muối (2g), Nước mắm (10ml)"
  },
  {
    "name": "bánh mì trứng",
    "ingredients": "Bánh mì (100g), Trứng gà (50g), Bơ hoặc dầu ăn (10g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Bún thịt nướng",
    "ingredients": "Bún tươi (100g), Thịt heo nướng (100g), Rau sống (30g), Đậu phộng rang (5g), Nước mắm chấm (15ml), Hành phi (5g)"
  },
  {
    "name": "mì quảng",
    "ingredients": "Mì Quảng (100g), Thịt gà (100g), Tôm (30g), Rau sống (30g), Đậu phộng rang (5g), Nước lèo (100ml)"
  },
  {
    "name": "Cá hồi áp chảo + bông cải xanh hấp",
    "ingredients": "Cá hồi (150g), Bông cải xanh (100g), Dầu ô liu (10g), Muối (2g), Tiêu (1g), Chanh (5ml)"
  },
  {
    "name": "Bún bò Huế",
    "ingredients": "Bún (150g), Thịt bò (100g), Chả lụa (50g), Giò heo (50g), Nước dùng (500ml), Rau sống"
  },
  {
    "name": "Phở bò",
    "ingredients": "Bánh phở (150g), Thịt bò (100g), Hành lá, Hành tây, Gừng, Gia vị, Nước hầm xương (500ml)"
  },
  {
    "name": "Cơm chiên trứng",
    "ingredients": "Cơm trắng (200g), Trứng gà (50g), Hành lá (10g), Dầu ăn (10g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Cơm rang thập cẩm",
    "ingredients": "Cơm trắng (150g), Thịt heo (50g), Tôm (50g), Trứng gà (50g), Đậu Hà Lan (20g), Cà rốt (20g), Hành tím (5g), Dầu ăn (15g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Mì xào bò",
    "ingredients": "Mì trứng (100g), Thịt bò (100g), Hành tây (30g), Cà rốt (20g), Dầu ăn (10g), Nước mắm (10ml), Tỏi băm (5g), Tiêu (1g)"
  },
  {
    "name": "Bún riêu cua",
    "ingredients": "Bún tươi (100g), Cua đồng (100g), Đậu phụ (50g), Cà chua (50g), Hành lá (10g), Tôm khô (10g), Mắm tôm (5ml), Rau thơm (20g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Canh bí đỏ nấu sườn",
    "ingredients": "Bí đỏ (150g), Thịt heo xay (50g), Hành tím (5g), Nước mắm (5ml), Dầu ăn (3ml), Hành lá (5g)"
  },
  {
    "name": "Canh mồng tơi thịt bằm",
    "ingredients": "Mồng tơi (100g), Thịt heo bằm (100g), Hành tím (5g), Nước mắm (7ml), Muối (2g), Tiêu (1g), Dầu ăn (5ml)"
  },
  {
    "name": "Thịt gà xào sả ớt",
    "ingredients": "Thịt gà (150g), Sả băm (15g), Ớt tươi (10g), Tỏi băm (5g), Dầu ăn (10g), Nước mắm (10ml), Đường (3g), Tiêu (1g)"
  },
  {
    "name": "Thịt bò xào bông cải xanh",
    "ingredients": "Thịt bò (150g), Bông cải xanh (100g), Tỏi băm (5g), Dầu ăn (7g), Nước mắm (10ml), Tiêu (1g)"
  },
  {
    "name": "Gà luộc",
    "ingredients": "Gà ta (150g), Muối (5g), Lá chanh (5g)"
  },
  {
    "name": "trứng luộc",
    "ingredients": "Trứng gà (100g), Muối (3g)"
  },
  {
    "name": "Xôi gấc",
    "ingredients": "Gạo nếp (150g), Gấc tươi (40g), Dầu ăn (5g), Đường (10g), Muối (2g), Dừa nạo (20g)"
  },
  {
    "name": "Cơm rang dưa bò",
    "ingredients": "Cơm trắng (150g), Thịt bò (100g), Dưa chua (50g), Hành tím (10g), Tỏi băm (5g), Dầu ăn (15g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Bún mắm",
    "ingredients": "Bún tươi (100g), Mắm cá (20ml), Tôm (50g), Thịt heo (50g), Rau sống (50g), Đậu phụ chiên (30g), Hành tím (10g), Ớt (5g)"
  },
  {
    "name": "Cá diêu hồng hấp gừng",
    "ingredients": "Cá diêu hồng (200g), Gừng (20g), Nước mắm (10ml), Hành lá (10g), Tiêu (1g)"
  },
  {
    "name": "Salad cá ngừ",
    "ingredients": "Cá ngừ hộp (150g), Rau xà lách (50g), Cà chua (30g), Dầu oliu (10ml), Nước cốt chanh (5ml), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Salad cá hồi",
    "ingredients": "Cá hồi (150g), Rau xà lách (50g), Dầu oliu (5ml), Nước cốt chanh (5ml), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "bông cải xanh luộc",
    "ingredients": "Bông cải xanh (150g), Muối (1g)"
  },
  {
    "name": "Bò xào cần tây",
    "ingredients": "Thịt bò (150g), Cần tây (50g), Tỏi băm (5g), Dầu ăn (10g), Nước mắm (10ml), Tiêu (1g)"
  },
  {
    "name": "Cá thu kho",
    "ingredients": "Cá thu (150g), Nước mắm (15ml), Đường (5g), Hành tím (10g), Tiêu (2g), Nước màu (5ml)"
  },
  {
    "name": "Rau muống luộc",
    "ingredients": "Rau muống (150g), Tỏi (5g), Dầu ăn (5ml), Nước mắm (5ml)"
  },
  {
    "name": "Trứng ốp la",
    "ingredients": "Trứng gà (50g), Dầu ăn (5g), Muối (1g)"
  },
  {
    "name": "ức gà áp chảo",
    "ingredients": "Ức gà (150g), Dầu oliu (5g), Muối (2g), Tiêu (1g), Tỏi băm (5g)"
  },
  {
    "name": "bí đỏ hấp",
    "ingredients": "Bí đỏ (150g), Muối (1g)"
  },
  {
    "name": "Đu đủ tươi",
    "ingredients": "Đu đủ chín (150g)"
  },
  {
    "name": "Hồng xiêm chín",
    "ingredients": "Hồng xiêm chín (150g)"
  },
  {
    "name": "Thanh long đỏ",
    "ingredients": "Thanh long đỏ (150g)"
  },
  {
    "name": "Lê tươi",
    "ingredients": "Lê tươi (150g)"
  },
  {
    "name": "Dâu tây tươi",
    "ingredients": "Dâu tây tươi (150g)"
  },
  {
    "name": "Cam tươi",
    "ingredients": "Cam tươi (150g)"
  },
  {
    "name": "Kiwi xanh",
    "ingredients": "Kiwi xanh (150g)"
  },
  {
    "name": "Đậu phụ nhồi thịt sốt cà chua",
    "ingredients": "Đậu phụ non (150g), Thịt heo xay (100g), Cà chua (100g), Hành tím (10g), Tỏi (5g), Dầu ăn (15g), Đường (5g), Muối (2g), Tiêu (1g), Nước mắm (10ml)"
  },
  {
    "name": "Sữa tươi",
    "ingredients": "Sữa tươi không đường (200ml)"
  },
  {
    "name": "Sinh tố chuối + bơ đậu phộng",
    "ingredients": "Chuối (100g), Bơ đậu phộng (20g), Sữa tươi không đường (150ml), Mật ong (10g)"
  },
  {
    "name": "Sinh tố bơ",
    "ingredients": "Bơ (100g), Sữa đặc có đường (30ml), Sữa tươi không đường (150ml), Đá viên (50g)"
  },
  {
    "name": "Su Su + Cà rốt hấp",
    "ingredients": "Su su (100g), Cà rốt (100g), Muối (1g)"
  },
  {
    "name": "Cần tây xào tỏi",
    "ingredients": "Cần tây (150g), Tỏi băm (5g), Dầu ăn (10g), Muối (1g)"
  },
  {
    "name": "Đậu rồng xào đậu phụ",
    "ingredients": "Đậu rồng (100g), Đậu phụ non (100g), Tỏi băm (5g), Dầu ăn (10g), Muối (1g)"
  },
  {
    "name": "Đọt bí xào tỏi",
    "ingredients": "Đọt bí (150g), Tỏi băm (5g), Dầu ăn (10g), Muối (1g)"
  },
  {
    "name": "Rau cải thìa xào nấm",
    "ingredients": "Rau cải thìa (150g), Nấm rơm hoặc nấm đông cô (50g), Tỏi băm (5g), Dầu ăn (10g), Muối (1g)"
  },
  {
    "name": "Gỏi bắp chuối + đậu phộng + chanh",
    "ingredients": "Bắp chuối bào (150g), Đậu phộng rang (30g), Nước cốt chanh (10ml), Đường (5g), Muối (1g), Ớt (5g)"
  },
  {
    "name": "Nộm rau muống chua ngọt",
    "ingredients": "Rau muống (150g), Đường (5g), Nước mắm (10ml), Giấm (5ml), Tỏi (5g), Ớt (5g)"
  },
  {
    "name": "Gỏi Dưa leo + cà rốt",
    "ingredients": "Dưa leo (150g), Cà rốt (50g), Nước cốt chanh (10ml), Đường (5g), Muối (1g)"
  },
  {
    "name": "Cơm tấm sườn + trứng + chả",
    "ingredients": "Cơm tấm (150g), Sườn nướng (100g), Trứng ốp la (50g), Chả trứng (50g), Dầu ăn (10g), Nước mắm (10ml)"
  },
  {
    "name": "Bánh mì thịt nướng",
    "ingredients": "Bánh mì (120g), Thịt nướng (100g), Rau sống (30g), Nước sốt (10ml)"
  },
  {
    "name": "Cháo gà hạt sen",
    "ingredients": "Gạo (100g), Thịt gà (100g), Hạt sen (30g), Hành lá (10g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Cháo đậu xanh thịt băm",
    "ingredients": "Gạo (100g), Đậu xanh cà vỏ (50g), Thịt heo băm (70g), Hành tím (10g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Súp cua trứng gà",
    "ingredients": "Thịt cua (100g), Trứng gà (50g), Nước dùng gà (200ml), Bột năng (10g), Hành lá (5g), Muối (2g), Tiêu (1g)"
  },
  {
    "name": "Sữa chua",
    "ingredients": "Sữa chua không đường (100ml)"
  },
  {
    "name": "Ngũ cốc + sữa tươi + chuối",
    "ingredients": "Ngũ cốc (40g), Sữa tươi (150ml), Chuối (100g)"
  },
  {
    "name": "Ngũ cốc + sữa tươi + kiwi + mật ong",
    "ingredients": "Ngũ cốc (40g), Sữa tươi (150ml), Kiwi xanh (70g), Mật ong (5ml)"
  },
  {
    "name": "Ngũ cốc + sữa tươi + dâu tây + hạt hạnh nhân",
    "ingredients": "Ngũ cốc (40g), Sữa tươi (150ml), Dâu tây (50g), Hạt hạnh nhân rang (10g)"
  },
  {
    "name": "Ngũ cốc + sữa chua + cam tươi",
    "ingredients": "Ngũ cốc (40g) + sữa chua không đường (100ml) + cam tươi (100g)"
  },
  {
    "name": "Sữa chua trái cây + hạt",
    "ingredients": "Sữa chua không đường (100g), Chuối (50g), Dâu tây (50g), Hạt óc chó (10g), Hạt hạnh nhân (10g)"
  },
  {
    "name": "Trứng luộc + khoai lang",
    "ingredients": "Trứng gà (100g), Khoai lang (100g)"
  },
  {
    "name": "Yến mạch nấu sữa + mật ong",
    "ingredients": "Yến mạch (50g), Sữa tươi (100ml), Mật ong (10ml)"
  },
  {
    "name": "Sữa + Trái cây theo mùa",
    "ingredients": "Sữa tươi (200ml), Trái cây tươi (100g)"
  },
  {
    "name": "Sữa chua + Trái cây tùy thích",
    "ingredients": "Sữa chua không đường (100g), Trái cây tươi (100g)"
  },
  {
    "name": "Sinh tố trái cây tùy thích",
    "ingredients": "Chuối (50g), Xoài (50g), Sữa tươi (150ml), Mật ong (5ml)"
  },
  {
    "name": "Chè đậu đen",
    "ingredients": "Đậu đen (50g), Đường (10g), Nước cốt dừa (10ml)"
  },
  {
    "name": "Chè thập cẩm",
    "ingredients": "Đậu đỏ (20g), Đậu xanh (20g), Bột báng (10g), Đường (10g), Nước cốt dừa (20ml)"
  },
  {
    "name": "Chè đậu đỏ",
    "ingredients": "Đậu đỏ (50g), Đường (10g), Nước cốt dừa (10ml)"
  },
  {
    "name": "Hoa quả dầm sữa chua",
    "ingredients": "Sữa chua (100g), Chuối (50g), Lê (50g), Dưa hấu (50g)"
  },
  {
    "name": "bông cải xanh luộc + trứng luộc",
    "ingredients": "Bông cải xanh (150g), Trừng gà luộc (50g)"
  },
  {
    "name": "Bắp luộc + Cà chua  + Trứng luộc",
    "ingredients": "Bắp luộc (100g ~3/4 quả), Cà chua (1 quả ~60g), Trứng gà luộc (1 quả ~50g)"
  },
  {
    "name": "Khoai lang + Bông cải xanh + Trứng luộc",
    "ingredients": "Khoai lang hấp/luộc (100g), Bông cải xanh (50g), Trứng gà luộc (1 quả ~50g)"
  },
  {
    "name": "Bí đỏ hấp + Trứng luộc + Cải chíp luộc",
    "ingredients": "Bí đỏ hấp (100g), Cải chíp luộc (100g), Trứng gà luộc (1 quả ~50g)"
  }
],
**ingrendients_data**
[
  {
    "ingredient": "cà tím",
    "calories_per_100g": 22.0,
    "protein_per_100g": 1.0,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 4.5
  },
  {
    "ingredient": "bánh phở",
    "calories_per_100g": 143.0,
    "protein_per_100g": 3.2,
    "fat_per_100g": 0.4,
    "carbs_per_100g": 31.7
  },
  {
    "ingredient": "bột mì ",
    "calories_per_100g": 346.0,
    "protein_per_100g": 10.3,
    "fat_per_100g": 1.1,
    "carbs_per_100g": 73.6
  },
  {
    "ingredient": "bơ",
    "calories_per_100g": 756.0,
    "protein_per_100g": 0.5,
    "fat_per_100g": 83.5,
    "carbs_per_100g": 0.5
  },
  {
    "ingredient": "mộc nhĩ",
    "calories_per_100g": 304.0,
    "protein_per_100g": 10.6,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 65.0
  },
  {
    "ingredient": "gấc",
    "calories_per_100g": 122.0,
    "protein_per_100g": 2.1,
    "fat_per_100g": 7.9,
    "carbs_per_100g": 10.5
  },
  {
    "ingredient": "bún",
    "calories_per_100g": 110.0,
    "protein_per_100g": 1.7,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 25.7
  },
  {
    "ingredient": "hoa chuối",
    "calories_per_100g": 20.0,
    "protein_per_100g": 1.5,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 3.5
  },
  {
    "ingredient": "Lạc rang",
    "calories_per_100g": 573.0,
    "protein_per_100g": 27.5,
    "fat_per_100g": 44.5,
    "carbs_per_100g": 15.5
  },
  {
    "ingredient": "miến dong",
    "calories_per_100g": 351.0,
    "protein_per_100g": 0.2,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 86.0
  },
  {
    "ingredient": "mùng tơi",
    "calories_per_100g": 21.0,
    "protein_per_100g": 1.8,
    "fat_per_100g": 0.3,
    "carbs_per_100g": 3.4
  },
  {
    "ingredient": "dứa",
    "calories_per_100g": 29.0,
    "protein_per_100g": 0.8,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 6.5
  },
  {
    "ingredient": "cần tây",
    "calories_per_100g": 48.0,
    "protein_per_100g": 3.7,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 7.9
  },
  {
    "ingredient": "ớt chuông",
    "calories_per_100g": 23.0,
    "protein_per_100g": 1.0,
    "fat_per_100g": 0.3,
    "carbs_per_100g": 4.0
  },
  {
    "ingredient": "mướp",
    "calories_per_100g": 17.0,
    "protein_per_100g": 0.9,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 2.8
  },
  {
    "ingredient": "su su",
    "calories_per_100g": 18.0,
    "protein_per_100g": 0.8,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "mướp đắng",
    "calories_per_100g": 16.0,
    "protein_per_100g": 0.9,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 2.8
  },
  {
    "ingredient": "gừng",
    "calories_per_100g": 25.0,
    "protein_per_100g": 0.4,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "su hào",
    "calories_per_100g": 27.0,
    "protein_per_100g": 1.7,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 6.2
  },
  {
    "ingredient": "hạt sen khô",
    "calories_per_100g": 334.0,
    "protein_per_100g": 20.0,
    "fat_per_100g": 2.4,
    "carbs_per_100g": 58.0
  },
  {
    "ingredient": "hạt sen tươi",
    "calories_per_100g": 161.0,
    "protein_per_100g": 9.5,
    "fat_per_100g": 0.5,
    "carbs_per_100g": 29.5
  },
  {
    "ingredient": "gạo nếp",
    "calories_per_100g": 344.0,
    "protein_per_100g": 8.6,
    "fat_per_100g": 1.5,
    "carbs_per_100g": 74.5
  },
  {
    "ingredient": "Gạo lứt",
    "calories_per_100g": 345.0,
    "protein_per_100g": 7.5,
    "fat_per_100g": 2.7,
    "carbs_per_100g": 72.8
  },
  {
    "ingredient": "tim heo",
    "calories_per_100g": 94.0,
    "protein_per_100g": 15.1,
    "fat_per_100g": 3.2,
    "carbs_per_100g": 1.2
  },
  {
    "ingredient": "gan heo",
    "calories_per_100g": 116.0,
    "protein_per_100g": 18.8,
    "fat_per_100g": 3.6,
    "carbs_per_100g": 2.0
  },
  {
    "ingredient": "lòng non heo",
    "calories_per_100g": 44.0,
    "protein_per_100g": 7.2,
    "fat_per_100g": 1.3,
    "carbs_per_100g": 0.8
  },
  {
    "ingredient": "tai heo",
    "calories_per_100g": 126.0,
    "protein_per_100g": 21.0,
    "fat_per_100g": 4.1,
    "carbs_per_100g": 1.3
  },
  {
    "ingredient": "Trứng gà",
    "calories_per_100g": 166.0,
    "protein_per_100g": 14.8,
    "fat_per_100g": 11.6,
    "carbs_per_100g": 0.5
  },
  {
    "ingredient": "Trứng vịt",
    "calories_per_100g": 184.0,
    "protein_per_100g": 13.0,
    "fat_per_100g": 14.2,
    "carbs_per_100g": 1.0
  },
  {
    "ingredient": "thịt gà",
    "calories_per_100g": 199.0,
    "protein_per_100g": 20.3,
    "fat_per_100g": 13.1,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt heo ba chỉ",
    "calories_per_100g": 260.0,
    "protein_per_100g": 16.5,
    "fat_per_100g": 21.5,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt bò ",
    "calories_per_100g": 118.0,
    "protein_per_100g": 21.0,
    "fat_per_100g": 3.8,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "dạ dày lợn",
    "calories_per_100g": 85.0,
    "protein_per_100g": 14.6,
    "fat_per_100g": 2.9,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "đuôi bò",
    "calories_per_100g": 137.0,
    "protein_per_100g": 19.7,
    "fat_per_100g": 6.5,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "gan bò",
    "calories_per_100g": 109.0,
    "protein_per_100g": 17.4,
    "fat_per_100g": 3.1,
    "carbs_per_100g": 3.0
  },
  {
    "ingredient": "gan lợn",
    "calories_per_100g": 116.0,
    "protein_per_100g": 18.8,
    "fat_per_100g": 3.6,
    "carbs_per_100g": 2.0
  },
  {
    "ingredient": "gan gà",
    "calories_per_100g": 111.0,
    "protein_per_100g": 18.2,
    "fat_per_100g": 3.4,
    "carbs_per_100g": 2.0
  },
  {
    "ingredient": "đuôi lợn",
    "calories_per_100g": 467.0,
    "protein_per_100g": 10.8,
    "fat_per_100g": 47.1,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "giò heo",
    "calories_per_100g": 553.0,
    "protein_per_100g": 16.0,
    "fat_per_100g": 54.3,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "tiết heo",
    "calories_per_100g": 44.0,
    "protein_per_100g": 10.7,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "trứng vịt lộn",
    "calories_per_100g": 182.0,
    "protein_per_100g": 13.6,
    "fat_per_100g": 13.6,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt bê mỡ",
    "calories_per_100g": 144.0,
    "protein_per_100g": 19.0,
    "fat_per_100g": 7.5,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "Thịt bê nạc",
    "calories_per_100g": 85.0,
    "protein_per_100g": 20.0,
    "fat_per_100g": 0.5,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt bồ câu",
    "calories_per_100g": 340.0,
    "protein_per_100g": 17.5,
    "fat_per_100g": 30.0,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt cừu",
    "calories_per_100g": 219.0,
    "protein_per_100g": 16.4,
    "fat_per_100g": 17.0,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt dê",
    "calories_per_100g": 122.0,
    "protein_per_100g": 20.7,
    "fat_per_100g": 4.3,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt hươu",
    "calories_per_100g": 94.0,
    "protein_per_100g": 19.0,
    "fat_per_100g": 2.0,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt ngỗng",
    "calories_per_100g": 409.0,
    "protein_per_100g": 14.0,
    "fat_per_100g": 39.2,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt vịt",
    "calories_per_100g": 267.0,
    "protein_per_100g": 17.8,
    "fat_per_100g": 21.8,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "thịt trâu",
    "calories_per_100g": 97.0,
    "protein_per_100g": 20.4,
    "fat_per_100g": 1.4,
    "carbs_per_100g": 0.9
  },
  {
    "ingredient": "thịt thỏ",
    "calories_per_100g": 158.0,
    "protein_per_100g": 21.5,
    "fat_per_100g": 8.0,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá rô đồng",
    "calories_per_100g": 126.0,
    "protein_per_100g": 19.1,
    "fat_per_100g": 5.5,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá chép",
    "calories_per_100g": 96.0,
    "protein_per_100g": 16.0,
    "fat_per_100g": 3.6,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá rô phi",
    "calories_per_100g": 100.0,
    "protein_per_100g": 19.7,
    "fat_per_100g": 2.3,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá quả",
    "calories_per_100g": 97.0,
    "protein_per_100g": 18.2,
    "fat_per_100g": 2.7,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá thu",
    "calories_per_100g": 166.0,
    "protein_per_100g": 18.2,
    "fat_per_100g": 10.3,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "mực",
    "calories_per_100g": 73.0,
    "protein_per_100g": 16.3,
    "fat_per_100g": 0.9,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "tôm khô",
    "calories_per_100g": 347.0,
    "protein_per_100g": 75.6,
    "fat_per_100g": 3.8,
    "carbs_per_100g": 2.5
  },
  {
    "ingredient": "tôm biển",
    "calories_per_100g": 82.0,
    "protein_per_100g": 17.6,
    "fat_per_100g": 0.9,
    "carbs_per_100g": 0.9
  },
  {
    "ingredient": "tôm đồng",
    "calories_per_100g": 90.0,
    "protein_per_100g": 18.4,
    "fat_per_100g": 1.8,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "tép gạo",
    "calories_per_100g": 58.0,
    "protein_per_100g": 11.7,
    "fat_per_100g": 1.2,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "sò",
    "calories_per_100g": 78.0,
    "protein_per_100g": 9.5,
    "fat_per_100g": 2.3,
    "carbs_per_100g": 4.9
  },
  {
    "ingredient": "rươi",
    "calories_per_100g": 89.0,
    "protein_per_100g": 12.4,
    "fat_per_100g": 4.4,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "ốc nhồi",
    "calories_per_100g": 84.0,
    "protein_per_100g": 11.9,
    "fat_per_100g": 0.7,
    "carbs_per_100g": 7.6
  },
  {
    "ingredient": "ốc bươu",
    "calories_per_100g": 84.0,
    "protein_per_100g": 11.1,
    "fat_per_100g": 0.7,
    "carbs_per_100g": 8.3
  },
  {
    "ingredient": "lươn",
    "calories_per_100g": 180.0,
    "protein_per_100g": 18.4,
    "fat_per_100g": 11.7,
    "carbs_per_100g": 0.2
  },
  {
    "ingredient": "hến",
    "calories_per_100g": 45.0,
    "protein_per_100g": 4.5,
    "fat_per_100g": 0.7,
    "carbs_per_100g": 5.1
  },
  {
    "ingredient": "ghẹ",
    "calories_per_100g": 54.0,
    "protein_per_100g": 11.9,
    "fat_per_100g": 0.7,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cua đồng",
    "calories_per_100g": 87.0,
    "protein_per_100g": 12.3,
    "fat_per_100g": 3.3,
    "carbs_per_100g": 2.0
  },
  {
    "ingredient": "cá trôi",
    "calories_per_100g": 127.0,
    "protein_per_100g": 18.8,
    "fat_per_100g": 5.7,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá trích",
    "calories_per_100g": 166.0,
    "protein_per_100g": 17.7,
    "fat_per_100g": 10.6,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá trê",
    "calories_per_100g": 173.0,
    "protein_per_100g": 16.5,
    "fat_per_100g": 11.9,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá trắm cỏ",
    "calories_per_100g": 91.0,
    "protein_per_100g": 17.0,
    "fat_per_100g": 2.6,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá trạch",
    "calories_per_100g": 110.0,
    "protein_per_100g": 20.4,
    "fat_per_100g": 3.2,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá thu đao",
    "calories_per_100g": 156.0,
    "protein_per_100g": 20.0,
    "fat_per_100g": 8.4,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá nục",
    "calories_per_100g": 111.0,
    "protein_per_100g": 20.2,
    "fat_per_100g": 3.3,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá ngừ",
    "calories_per_100g": 87.0,
    "protein_per_100g": 21.0,
    "fat_per_100g": 0.3,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá mè",
    "calories_per_100g": 144.0,
    "protein_per_100g": 15.4,
    "fat_per_100g": 9.1,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "cá hồi",
    "calories_per_100g": 136.0,
    "protein_per_100g": 22.0,
    "fat_per_100g": 5.3,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "rau thơm",
    "calories_per_100g": 18.0,
    "protein_per_100g": 2.0,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 2.4
  },
  {
    "ingredient": "Cà rốt",
    "calories_per_100g": 39.0,
    "protein_per_100g": 1.5,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 7.8
  },
  {
    "ingredient": "Đậu hà lan",
    "calories_per_100g": 72.0,
    "protein_per_100g": 6.5,
    "fat_per_100g": 0.4,
    "carbs_per_100g": 10.6
  },
  {
    "ingredient": "hành tây",
    "calories_per_100g": 41.0,
    "protein_per_100g": 1.8,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 8.2
  },
  {
    "ingredient": "khoai mỡ",
    "calories_per_100g": NaN,
    "protein_per_100g": NaN,
    "fat_per_100g": NaN,
    "carbs_per_100g": NaN
  },
  {
    "ingredient": "dưa chuột",
    "calories_per_100g": 16.0,
    "protein_per_100g": 0.8,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 2.9
  },
  {
    "ingredient": "rau ngót",
    "calories_per_100g": 35.0,
    "protein_per_100g": 5.3,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 3.4
  },
  {
    "ingredient": "cà chua",
    "calories_per_100g": 20.0,
    "protein_per_100g": 0.6,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 4.0
  },
  {
    "ingredient": "bông cải xanh",
    "calories_per_100g": 26.0,
    "protein_per_100g": 3.0,
    "fat_per_100g": 0.3,
    "carbs_per_100g": 2.9
  },
  {
    "ingredient": "đậu que",
    "calories_per_100g": 73.0,
    "protein_per_100g": 5.0,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 13.3
  },
  {
    "ingredient": "dưa cải muối",
    "calories_per_100g": 13.0,
    "protein_per_100g": 0.8,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 2.5
  },
  {
    "ingredient": "hành lá",
    "calories_per_100g": 22.0,
    "protein_per_100g": 1.3,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 4.3
  },
  {
    "ingredient": "rau cải",
    "calories_per_100g": 16.0,
    "protein_per_100g": 1.7,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 1.9
  },
  {
    "ingredient": "đậu bắp",
    "calories_per_100g": 33.0,
    "protein_per_100g": 1.9,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 7.5
  },
  {
    "ingredient": "rau kinh giới",
    "calories_per_100g": 22.0,
    "protein_per_100g": 2.7,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 2.8
  },
  {
    "ingredient": "bí đao",
    "calories_per_100g": 12.0,
    "protein_per_100g": 0.6,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 2.4
  },
  {
    "ingredient": "nấm rơm",
    "calories_per_100g": 57.0,
    "protein_per_100g": 3.6,
    "fat_per_100g": 3.2,
    "carbs_per_100g": 3.4
  },
  {
    "ingredient": "nấm huơng tươi",
    "calories_per_100g": 39.0,
    "protein_per_100g": 5.5,
    "fat_per_100g": 0.5,
    "carbs_per_100g": 3.1
  },
  {
    "ingredient": "rau muống",
    "calories_per_100g": 25.0,
    "protein_per_100g": 3.2,
    "fat_per_100g": 0.4,
    "carbs_per_100g": 2.1
  },
  {
    "ingredient": "nấm hương khô",
    "calories_per_100g": 274.0,
    "protein_per_100g": 36.0,
    "fat_per_100g": 4.0,
    "carbs_per_100g": 23.5
  },
  {
    "ingredient": "Bầu",
    "calories_per_100g": 14.0,
    "protein_per_100g": 0.6,
    "fat_per_100g": 0.02,
    "carbs_per_100g": 2.9
  },
  {
    "ingredient": "bí ngô",
    "calories_per_100g": 27.0,
    "protein_per_100g": 0.3,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 6.1
  },
  {
    "ingredient": "cà pháo",
    "calories_per_100g": 20.0,
    "protein_per_100g": 1.5,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 3.6
  },
  {
    "ingredient": "cà tím",
    "calories_per_100g": 22.0,
    "protein_per_100g": 1.0,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 4.5
  },
  {
    "ingredient": "cải bắp",
    "calories_per_100g": 29.0,
    "protein_per_100g": 1.8,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 5.3
  },
  {
    "ingredient": "cải cúc",
    "calories_per_100g": 14.0,
    "protein_per_100g": 1.6,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 1.9
  },
  {
    "ingredient": "cải soong",
    "calories_per_100g": 15.0,
    "protein_per_100g": 2.1,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 1.3
  },
  {
    "ingredient": "cải thìa",
    "calories_per_100g": 17.0,
    "protein_per_100g": 1.4,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 2.4
  },
  {
    "ingredient": "chuối xanh",
    "calories_per_100g": 74.0,
    "protein_per_100g": 1.2,
    "fat_per_100g": 0.5,
    "carbs_per_100g": 16.4
  },
  {
    "ingredient": "củ cải trắng",
    "calories_per_100g": 21.0,
    "protein_per_100g": 1.5,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 3.6
  },
  {
    "ingredient": "củ đậu",
    "calories_per_100g": 28.0,
    "protein_per_100g": 1.0,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 6.0
  },
  {
    "ingredient": "dọc mùng",
    "calories_per_100g": 5.0,
    "protein_per_100g": 0.4,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 0.8
  },
  {
    "ingredient": "dưa chuột",
    "calories_per_100g": 16.0,
    "protein_per_100g": 0.8,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 2.9
  },
  {
    "ingredient": "đậu rồng",
    "calories_per_100g": 34.0,
    "protein_per_100g": 1.9,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 6.3
  },
  {
    "ingredient": "đu đủ xanh",
    "calories_per_100g": 22.0,
    "protein_per_100g": 0.8,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 4.6
  },
  {
    "ingredient": "gấc",
    "calories_per_100g": 122.0,
    "protein_per_100g": 2.1,
    "fat_per_100g": 7.9,
    "carbs_per_100g": 10.5
  },
  {
    "ingredient": "hành củ tươi",
    "calories_per_100g": 26.0,
    "protein_per_100g": 1.3,
    "fat_per_100g": 0.4,
    "carbs_per_100g": 4.4
  },
  {
    "ingredient": "hoa lý",
    "calories_per_100g": 23.0,
    "protein_per_100g": 2.9,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 2.8
  },
  {
    "ingredient": "lá lốt",
    "calories_per_100g": 39.0,
    "protein_per_100g": 4.3,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 5.4
  },
  {
    "ingredient": "măng chua",
    "calories_per_100g": 11.0,
    "protein_per_100g": 1.4,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 1.4
  },
  {
    "ingredient": "măng tây",
    "calories_per_100g": 14.0,
    "protein_per_100g": 2.2,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 1.1
  },
  {
    "ingredient": "mướp",
    "calories_per_100g": 17.0,
    "protein_per_100g": 0.9,
    "fat_per_100g": 0.2,
    "carbs_per_100g": 2.8
  },
  {
    "ingredient": "nước mắm ",
    "calories_per_100g": 60.0,
    "protein_per_100g": 15.0,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "tiêu",
    "calories_per_100g": 231.0,
    "protein_per_100g": 7.0,
    "fat_per_100g": 7.4,
    "carbs_per_100g": 34.1
  },
  {
    "ingredient": "muối",
    "calories_per_100g": 0.0,
    "protein_per_100g": 0.0,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "bột ghệ",
    "calories_per_100g": 295.0,
    "protein_per_100g": 7.8,
    "fat_per_100g": 9.9,
    "carbs_per_100g": 43.8
  },
  {
    "ingredient": "nghệ tươi",
    "calories_per_100g": 25.0,
    "protein_per_100g": 1.1,
    "fat_per_100g": 0.3,
    "carbs_per_100g": 4.4
  },
  {
    "ingredient": "ớt bột khô",
    "calories_per_100g": 227.0,
    "protein_per_100g": 15.6,
    "fat_per_100g": 4.2,
    "carbs_per_100g": 31.8
  },
  {
    "ingredient": "riềng",
    "calories_per_100g": 26.0,
    "protein_per_100g": 0.3,
    "fat_per_100g": 0.0,
    "carbs_per_100g": 2.5
  },
  {
    "ingredient": "mắm tôm ",
    "calories_per_100g": 73.0,
    "protein_per_100g": 14.8,
    "fat_per_100g": 1.5,
    "carbs_per_100g": 0.0
  },
  {
    "ingredient": "tương ớt",
    "calories_per_100g": 37.0,
    "protein_per_100g": 0.5,
    "fat_per_100g": 0.5,
    "carbs_per_100g": 7.6
  },
  {
    "ingredient": "xì dầu",
    "calories_per_100g": 53.0,
    "protein_per_100g": 6.3,
    "fat_per_100g": 0.04,
    "carbs_per_100g": 6.8
  },
  {
    "ingredient": "hành tím",
    "calories_per_100g": 40.0,
    "protein_per_100g": 1.0,
    "fat_per_100g": 1.0,
    "carbs_per_100g": 9.0
  },
  {
    "ingredient": "Sả",
    "calories_per_100g": 30.0,
    "protein_per_100g": 1.0,
    "fat_per_100g": 1.0,
    "carbs_per_100g": 7.0
  },
  {
    "ingredient": "đậu xanh",
    "calories_per_100g": 328.0,
    "protein_per_100g": 23.4,
    "fat_per_100g": 2.4,
    "carbs_per_100g": 53.1
  }
]
}`