const initialCounts = [0, 23, 75, 134, 73, 94, 76, 59, 45, 15];
    const segmentBody = document.querySelector("#segmentsInput");
    const resultRows = document.querySelector("#resultRows");
    const statusEl = document.querySelector("#status");
    const layoutShell = document.querySelector("#layoutShell");
    const queryWrap = document.querySelector("#queryWrap");
    const toggleQueryButton = document.querySelector("#toggleQuery");

    const ids = [
      "vacancy",
      "resumeQuery",
      "region",
      "schedule",
      "workMode",
      "citizenship",
      "maxSalary",
      "analysisDate",
      "totalCandidates"
    ];

    function numberValue(id) {
      return Math.max(0, Number(document.querySelector("#" + id).value) || 0);
    }

    function textValue(id) {
      return document.querySelector("#" + id).value.trim();
    }

    function formatNumber(value) {
      return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value || 0);
    }

    function formatMoney(value) {
      return new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 0
      }).format(value || 0) + " ₽";
    }

    function formatPercent(value) {
      return new Intl.NumberFormat("ru-RU", {
        style: "percent",
        maximumFractionDigits: 1
      }).format(value || 0);
    }

    function formatDate(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat("ru-RU").format(date);
    }

    function shareHeatStyle(count, maxCount) {
      if (!count || !maxCount) {
        return "background-color: rgba(255, 255, 255, 0.72);";
      }

      const intensity = Math.min(1, count / maxCount);
      const saturation = 30 + intensity * 14;
      const lightness = 96 - intensity * 26;
      const edgeAlpha = 0.12 + intensity * 0.2;

      return [
        `background-color: hsl(102 ${saturation}% ${lightness}%);`,
        `box-shadow: inset 4px 0 0 rgba(73, 159, 205, ${edgeAlpha});`
      ].join(" ");
    }

    function buildSegments(maxSalary) {
      const width = Math.floor(maxSalary / 10) - 1;
      return Array.from({ length: 10 }, (_, index) => {
        const from = index === 0 ? 0 : index * (width + 1);
        const to = index === 9 ? maxSalary : from + width;
        return { index: index + 1, from, to };
      });
    }

    function groupedMedian(segments, counts, total) {
      if (!total) return 0;

      const target = total / 2;
      let cumulative = 0;

      for (let index = 0; index < segments.length; index += 1) {
        const count = counts[index] || 0;
        const nextCumulative = cumulative + count;

        if (nextCumulative >= target && count > 0) {
          const segment = segments[index];
          const width = segment.to - segment.from + 1;
          return segment.from + ((target - cumulative) / count) * width;
        }

        cumulative = nextCumulative;
      }

      return 0;
    }

    function getCounts() {
      return Array.from(document.querySelectorAll("[data-count]")).map((input) => {
        return Math.max(0, Number(input.value) || 0);
      });
    }

    function setText(id, value) {
      document.querySelector("#" + id).textContent = value;
    }

    function renderSegmentInputs(segments, counts) {
      segmentBody.innerHTML = segments.map((segment, index) => `
        <tr>
          <td>${segment.index}</td>
          <td data-range-from="${index}">${formatNumber(segment.from)}</td>
          <td data-range-to="${index}">${formatNumber(segment.to)}</td>
          <td><input data-count="${index}" type="number" min="0" step="1" value="${counts[index] || 0}" aria-label="Кандидаты в сегменте ${segment.index}"></td>
        </tr>
      `).join("");

      segmentBody.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", render);
      });
    }

    function updateSegmentRanges(segments) {
      segments.forEach((segment, index) => {
        const fromCell = document.querySelector(`[data-range-from="${index}"]`);
        const toCell = document.querySelector(`[data-range-to="${index}"]`);
        if (fromCell) fromCell.textContent = formatNumber(segment.from);
        if (toCell) toCell.textContent = formatNumber(segment.to);
      });
    }

    function currentReport() {
      const maxSalary = numberValue("maxSalary");
      const totalCandidates = numberValue("totalCandidates");
      const segments = buildSegments(maxSalary);
      const counts = getCounts();
      const withSalary = counts.reduce((sum, count) => sum + count, 0);
      const median = groupedMedian(segments, counts, withSalary);
      const missing = Math.max(0, totalCandidates - withSalary);
      const missingShare = totalCandidates ? missing / totalCandidates : 0;
      const analysisDate = new Date(textValue("analysisDate") + "T00:00:00");
      const periodStart = new Date(analysisDate);
      periodStart.setDate(periodStart.getDate() - 30);

      return {
        vacancy: textValue("vacancy"),
        region: textValue("region"),
        resumeQuery: textValue("resumeQuery"),
        segments,
        counts,
        totalCandidates,
        withSalary,
        median,
        missing,
        missingShare,
        periodStart,
        analysisDate
      };
    }

    function render() {
      const report = currentReport();
      updateSegmentRanges(report.segments);

      setText("metricTotal", formatNumber(report.totalCandidates));
      setText("metricWithSalary", formatNumber(report.withSalary));
      setText("metricAverage", formatMoney(report.median));
      setText("metricMissing", formatPercent(report.missingShare));

      setText("outVacancy", report.vacancy || "—");
      setText("outRegion", report.region || "—");
      setText("outDateFrom", formatDate(report.periodStart));
      setText("outDateTo", formatDate(report.analysisDate));
      setText("outTotal", formatNumber(report.totalCandidates));
      setText("outWithSalary", formatNumber(report.withSalary));
      setText("outAverage", formatMoney(report.median));

      const maxSegmentCount = Math.max(...report.counts);

      resultRows.innerHTML = report.segments.map((segment, index) => {
        const count = report.counts[index] || 0;
        const share = report.withSalary ? count / report.withSalary : 0;
        return `
          <tr>
            <td>${formatNumber(segment.from)}</td>
            <td>${formatNumber(segment.to)}</td>
            <td>${formatNumber(count)}</td>
            <td class="share-cell" style="${shareHeatStyle(count, maxSegmentCount)}">${formatPercent(share)}</td>
          </tr>
        `;
      }).join("");

      const query = report.resumeQuery;
      const queryLink = document.querySelector("#outQuery");
      queryLink.textContent = query || "—";
      queryLink.href = query || "#";
      statusEl.textContent = "";
    }

    function reportAsTsv() {
      const report = currentReport();
      const rows = [
        ["Зарплатные ожидания кандидатов"],
        [],
        ["Желаемая должность", report.vacancy],
        ["Регион проживания", report.region],
        ["Данные за период", formatDate(report.periodStart), formatDate(report.analysisDate)],
        ["Целевых кандидатов в регионе", report.totalCandidates],
        ["Кандидатов указавших зарплатные ожидания", report.withSalary],
        ["Медианные ожидания кандидатов", Math.round(report.median)],
        [],
        ["ОТ", "ДО", "Кол-во кандидатов", "Доля сегмента от всех кандидатов"],
        ...report.segments.map((segment, index) => {
          const count = report.counts[index] || 0;
          const share = report.withSalary ? count / report.withSalary : 0;
          return [segment.from, segment.to, count, share];
        }),
        [],
        ["Поисковый запрос", report.resumeQuery]
      ];

      return rows.map((row) => row.map((cell) => String(cell ?? "").replaceAll("\t", " ")).join("\t")).join("\n");
    }

    async function copyReport() {
      try {
        await navigator.clipboard.writeText(reportAsTsv());
        statusEl.textContent = "Таблица скопирована.";
      } catch (error) {
        statusEl.textContent = "Не удалось скопировать автоматически.";
      }
    }

    function downloadCsv() {
      const csv = reportAsTsv();
      const blob = new Blob(["\ufeff" + csv], { type: "text/tab-separated-values;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "salary-market-analysis.tsv";
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(link.href);
      link.remove();
      statusEl.textContent = "Файл скачан.";
    }

    function setInputsCollapsed(isCollapsed) {
      document.body.classList.toggle("inputs-collapsed", isCollapsed);
      layoutShell.classList.toggle("is-collapsed", isCollapsed);
    }

    function toggleQuery() {
      const hidden = !queryWrap.classList.contains("query-hidden");
      queryWrap.classList.toggle("query-hidden", hidden);
      toggleQueryButton.textContent = hidden ? "+" : "−";
      toggleQueryButton.setAttribute("aria-label", hidden ? "Показать поисковый запрос" : "Скрыть поисковый запрос");
      toggleQueryButton.setAttribute("title", hidden ? "Показать поисковый запрос" : "Скрыть поисковый запрос");
    }

    renderSegmentInputs(buildSegments(numberValue("maxSalary")), initialCounts);
    ids.forEach((id) => document.querySelector("#" + id).addEventListener("input", render));
    document.querySelector("#copyReport").addEventListener("click", copyReport);
    document.querySelector("#downloadCsv").addEventListener("click", downloadCsv);
    document.querySelector("#printReport").addEventListener("click", () => window.print());
    document.querySelector("#hideInputs").addEventListener("click", () => setInputsCollapsed(true));
    document.querySelector("#showInputs").addEventListener("click", () => setInputsCollapsed(false));
    toggleQueryButton.addEventListener("click", toggleQuery);
    render();

