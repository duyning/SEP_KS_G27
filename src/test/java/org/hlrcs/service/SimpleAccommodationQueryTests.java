package org.hlrcs.service;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SimpleAccommodationQueryTests {
    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "Phòng dưới 2,5 triệu/tháng | 2500000",
            "Tìm phòng giá thuê tối đa 2.5 triệu / tháng | 2500000",
            "Mình cần phòng không quá 2.500.000 đồng | 2500000",
            "Ngân sách tối đa 900k mỗi tháng | 900000"
    })
    void recognizesCommonMonthlyPriceCaps(String description, String budget) {
        var result = SimpleAccommodationQuery.parse(description).orElseThrow();

        assertEquals(0, new BigDecimal(budget).compareTo(result.maxBudget()));
        assertTrue(result.amenities().isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Phòng dưới 2,5 triệu/tháng, có điều hòa và bình nóng lạnh, có tủ lạnh, có bàn ghế",
            "Phong duoi 2,5 trieu/thang co dieu hoa va binh nong lanh, co thu lanh, co ban ghe."
    })
    void readsTheBudgetAndEveryAmenityFromTheExample(String description) {
        var result = SimpleAccommodationQuery.parse(description).orElseThrow();

        assertEquals(0, BigDecimal.valueOf(2_500_000).compareTo(result.maxBudget()));
        assertEquals(List.of("airConditioner", "waterHeater", "refrigerator", "desk"), result.amenities());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Phòng dưới 2,5 triệu không có điều hòa",
            "Phòng dưới 2,5 triệu, có điều hòa, gần trạm xe buýt",
            "Phòng có điều hòa hoặc quạt trần",
            "Phòng dưới 2,5 triệu và tối đa 3 triệu",
            "Phòng dưới 2,5",
            "Có điều hòa không?"
    })
    void leavesUnclearOrUnsupportedRequestsForGemini(String description) {
        assertTrue(SimpleAccommodationQuery.parse(description).isEmpty());
    }
}
