use iced::widget::{button, column, container, row, text, text_input, checkbox, scrollable};
use iced::{Element, Length, Theme, Task, Font, window};
use plotters::prelude::*;
use plotters_iced::{Chart, ChartWidget};
use std::path::PathBuf;
use std::fs::File;
use std::io::{BufRead, BufReader};

pub fn main() -> iced::Result {
    iced::application("SimPlot", SimPlot::update, SimPlot::view)
        .theme(SimPlot::theme)
        .window(window::Settings {
            // platform_specific: ... // iced 0.13 window settings?
            ..Default::default()
        })
        .default_font(Font::with_name("Noto Sans CJK JP"))
        .run_with(SimPlot::new)
}

struct SimPlot {
    data_sets: Vec<DataSet>,
    x_min: f32,
    x_max: f32,
    y_min: f32,
    y_max: f32,
}

struct DataSet {
    series: Vec<Series>,
}

struct Series {
    label: String,
    points: Vec<(f32, f32)>,
    visible: bool,
}

#[derive(Debug, Clone)]
enum Message {
    OpenFile,
    FileSelected(Option<PathBuf>),
    XMinChanged(String),
    XMaxChanged(String),
    YMinChanged(String),
    YMaxChanged(String),
    ToggleVisibility(usize, usize, bool),
    LabelChanged(usize, usize, String),
    FontLoaded(Result<(), iced::font::Error>),
}

impl SimPlot {
    fn new() -> (Self, Task<Message>) {
        (
            Self {
                data_sets: Vec::new(),
                x_min: 0.0,
                x_max: 10.0,
                y_min: 0.0,
                y_max: 10.0,
            },
            Task::batch(vec![
                iced::font::load(include_bytes!("/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc")).map(Message::FontLoaded),
                window::get_latest().and_then(|id| window::set_ime_allowed(id, true)),
            ]),
        )
    }

    fn update(&mut self, message: Message) -> Task<Message> {
        match message {
            Message::OpenFile => {
                Task::perform(
                    async {
                        rfd::AsyncFileDialog::new()
                            .add_filter("Tab Separated", &["txt", "tsv"])
                            .pick_file()
                            .await
                            .map(|file| file.path().to_path_buf())
                    },
                    Message::FileSelected,
                )
            }
            Message::FileSelected(Some(path)) => {
                if let Ok(data_set) = self.read_data(&path) {
                    self.data_sets.push(data_set);
                    self.auto_scale();
                }
                Task::none()
            }
            Message::FileSelected(None) => Task::none(),
            Message::XMinChanged(s) => {
                if !s.is_empty() {
                    if let Ok(v) = s.parse() { self.x_min = v; }
                }
                Task::none()
            }
            Message::XMaxChanged(s) => {
                if !s.is_empty() {
                    if let Ok(v) = s.parse() { self.x_max = v; }
                }
                Task::none()
            }
            Message::YMinChanged(s) => {
                if !s.is_empty() {
                    if let Ok(v) = s.parse() { self.y_min = v; }
                }
                Task::none()
            }
            Message::YMaxChanged(s) => {
                if !s.is_empty() {
                    if let Ok(v) = s.parse() { self.y_max = v; }
                }
                Task::none()
            }
            Message::ToggleVisibility(ds_idx, s_idx, visible) => {
                if let Some(ds) = self.data_sets.get_mut(ds_idx) {
                    if let Some(s) = ds.series.get_mut(s_idx) {
                        s.visible = visible;
                    }
                }
                Task::none()
            }
            Message::LabelChanged(ds_idx, s_idx, new_label) => {
                if let Some(ds) = self.data_sets.get_mut(ds_idx) {
                    if let Some(s) = ds.series.get_mut(s_idx) {
                        s.label = new_label;
                    }
                }
                Task::none()
            }
            Message::FontLoaded(_) => Task::none(),
        }
    }

    fn view(&self) -> Element<'_, Message> {
        let chart = ChartWidget::new(self)
            .width(Length::Fill)
            .height(Length::Fill);

        let mut series_list = column![].spacing(5);
        for (ds_idx, ds) in self.data_sets.iter().enumerate() {
            for (s_idx, s) in ds.series.iter().enumerate() {
                series_list = series_list.push(
                    row![
                        checkbox("", s.visible).on_toggle(move |v| Message::ToggleVisibility(ds_idx, s_idx, v)).size(12),
                        text_input("Label", &s.label).on_input(move |v| Message::LabelChanged(ds_idx, s_idx, v)).size(11),
                    ]
                    .spacing(5)
                    .align_items(iced::Alignment::Center)
                );
            }
        }

        let controls = column![
            button(text("Open File").size(12)).on_press(Message::OpenFile),
            text("X Range").size(12),
            row![
                text_input("Min", &self.x_min.to_string()).on_input(Message::XMinChanged).size(11),
                text_input("Max", &self.x_max.to_string()).on_input(Message::XMaxChanged).size(11),
            ].spacing(5),
            text("Y Range").size(12),
            row![
                text_input("Min", &self.y_min.to_string()).on_input(Message::YMinChanged).size(11),
                text_input("Max", &self.y_max.to_string()).on_input(Message::YMaxChanged).size(11),
            ].spacing(5),
            text("Series & Labels").size(12),
            scrollable(series_list).height(Length::Fill),
        ]
        .spacing(8)
        .padding(10)
        .width(Length::Fixed(220.0));

        row![
            container(chart).width(Length::Fill).height(Length::Fill).padding(10),
            controls,
        ]
        .into()
    }

    fn theme(&self) -> Theme {
        Theme::Light
    }

    fn read_data(&self, path: &PathBuf) -> Result<DataSet, Box<dyn std::error::Error>> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut multi_series: Vec<Vec<(f32, f32)>> = Vec::new();
        let file_name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();

        for line in reader.lines() {
            let line = line?;
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let x: f32 = parts[0].parse()?;
                for (i, y_part) in parts.iter().skip(1).enumerate() {
                    let y: f32 = y_part.parse()?;
                    if multi_series.len() <= i {
                        multi_series.push(Vec::new());
                    }
                    multi_series[i].push((x, y));
                }
            }
        }

        let series = multi_series.into_iter().enumerate().map(|(i, points)| {
            Series {
                label: format!("{}_Y{}", file_name, i + 1),
                points,
                visible: true,
            }
        }).collect();

        Ok(DataSet {
            series,
        })
    }

    fn auto_scale(&mut self) {
        if self.data_sets.is_empty() { return; }

        let mut x_min = f32::MAX;
        let mut x_max = f32::MIN;
        let mut y_min = f32::MAX;
        let mut y_max = f32::MIN;

        for ds in &self.data_sets {
            for s in &ds.series {
                for &(x, y) in &s.points {
                    x_min = x_min.min(x);
                    x_max = x_max.max(x);
                    y_min = y_min.min(y);
                    y_max = y_max.max(y);
                }
            }
        }

        if x_min < x_max {
            self.x_min = x_min;
            self.x_max = x_max;
        }
        if y_min < y_max {
            self.y_min = y_min;
            self.y_max = y_max;
        }
    }
}

impl Chart<Message> for SimPlot {
    type State = ();

    fn build_chart<DB: DrawingBackend>(&self, _state: &Self::State, mut builder: ChartBuilder<DB>) {
        let mut chart = builder
            .margin(10)
            .x_label_area_size(40)
            .y_label_area_size(40)
            .build_cartesian_2d(self.x_min..self.x_max, self.y_min..self.y_max)
            .expect("Failed to build chart");

        chart.configure_mesh().draw().expect("Failed to draw mesh");

        let mut color_idx = 0;
        for ds in &self.data_sets {
            for s in &ds.series {
                let color = Palette99::pick(color_idx).mix(0.8);
                color_idx += 1;
                
                if s.visible {
                    chart
                        .draw_series(LineSeries::new(
                            s.points.iter().cloned(),
                            color.stroke_width(2),
                        ))
                        .expect("Failed to draw series")
                        .label(&s.label)
                        .legend(move |(x, y)| PathElement::new(vec![(x, y), (x + 20, y)], color.stroke_width(2)));
                }
            }
        }

        chart
            .configure_series_labels()
            .label_font(("Noto Sans CJK JP", 12))
            .border_style(&BLACK)
            .background_style(&WHITE.mix(0.8))
            .draw()
            .expect("Failed to draw legend");
    }
}
